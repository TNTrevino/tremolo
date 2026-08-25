// Package services provides authentication and user management functionality
package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"sight-reading/database/generated"
	"sight-reading/logger"
	"sight-reading/middleware"

	dtos "sight-reading/DTOs"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

const (
	// BcryptCost is the computational cost for password hashing
	// Higher values provide more security but take longer to compute
	BcryptCost = 12

	// MaxLoginAttempts is the number of failed login attempts before account lockout
	MaxLoginAttempts = 5

	// DefaultLockoutDurationMinutes is the default account lockout time in minutes
	DefaultLockoutDurationMinutes = 15
)

// Login verifies an email/password pair and, on success, issues a fresh
// access/refresh token pair. It also owns the account-lockout bookkeeping:
// failed attempts are counted per email, and an account that crosses
// MaxLoginAttempts is locked for getLockoutDuration(). Errors incrementing
// or reading that bookkeeping are logged and swallowed (not surfaced to
// the caller) -- that's existing behavior, tracked separately for cleanup.
func Login(ctx context.Context, q generated.Querier, req dtos.LoginRequest) (*dtos.LoginResponse, error) {
	normalizedEmail := normalizeEmail(req.Email)
	emailNullStr := sql.NullString{String: normalizedEmail, Valid: true}

	lockedUntil, err := q.CheckAccountLocked(ctx, emailNullStr)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		logger.Error("Error checking account lock status", "error", err.Error())
		return nil, fmt.Errorf("%w: %w", ErrLockCheckFailed, err)
	}

	if lockedUntil.Valid {
		logger.Info("Login attempt on locked account", "email", normalizedEmail)
		return nil, ErrAccountLocked
	}

	user, err := q.GetUserByEmail(ctx, emailNullStr)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			logger.Info("User not found with provided", "email", normalizedEmail)
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("%w: %w", ErrUserLookupFailed, err)
	}

	if user.Password == "" {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		logger.Info("Invalid password, incrementing failed attempts", "error", err.Error())
		if err := q.IncrementFailedAttempts(ctx, emailNullStr); err != nil {
			logger.Error("Failed to increment failed attempts", "error", err.Error())
		}

		attempts, attemptsErr := q.GetFailedAttempts(ctx, emailNullStr)
		if attemptsErr != nil {
			logger.Error("Failed to get failed attempts", "error", attemptsErr.Error())
		} else if int(attempts) >= MaxLoginAttempts {
			lockDuration := getLockoutDuration()
			lockParams := generated.LockAccountParams{
				LockedUntil: sql.NullTime{Time: time.Now().Add(lockDuration), Valid: true},
				Email:       emailNullStr,
			}
			if lockErr := q.LockAccount(ctx, lockParams); lockErr != nil {
				logger.Error("Failed to lock account", "error", lockErr.Error())
			} else {
				logger.Info("Account locked due to failed login attempts", "email", normalizedEmail, "attempts", attempts)
				return nil, &LockoutTriggeredError{Duration: lockDuration}
			}
		}

		return nil, ErrInvalidCredentials
	}

	if err := q.ResetLockout(ctx, emailNullStr); err != nil {
		logger.Error("Failed to reset lockout", "error", err.Error())
	}

	accessToken, err := middleware.GenerateAccessToken(int(user.ID))
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrAccessTokenGeneration, err)
	}

	refreshToken, err := middleware.GenerateRefreshToken(int(user.ID))
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrRefreshTokenGeneration, err)
	}

	return &dtos.LoginResponse{
		User:         convertGetUserByEmailRowToUserResponse(user),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}

// GetCurrentUser returns the authenticated caller's own user row. A
// missing row is ErrNotFound (the controller renders this as
// Unauthorized rather than a generic not-found, since a valid token for
// a since-deleted user shouldn't leak that distinction).
func GetCurrentUser(ctx context.Context, q generated.Querier, userID int) (*dtos.UserResponse, error) {
	user, err := q.GetUserByID(ctx, int32(userID))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	response := convertGetUserByIDRowToUserResponse(user)
	return &response, nil
}

// HashPassword hashes a plaintext password with bcrypt at BcryptCost.
func HashPassword(password string) (string, error) {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hashedBytes), nil
}

// Register creates a new email/password user (student or teacher).
//
// A TEACHER signup additionally spends one use of an invite code (#250).
// Where that happens is load-bearing: after the email-taken check, so a
// teacher retrying a signup they already completed does not burn a second
// use; and before CreateUser, so no TEACHER row can exist that was not
// gated. If CreateUser then fails, the use is handed back.
func Register(ctx context.Context, q generated.Querier, req dtos.RegisterRequest) (*dtos.RegisterResponse, error) {
	normalizedEmail := normalizeEmail(req.Email)
	emailNullStr := sql.NullString{String: normalizedEmail, Valid: true}

	exists, err := checkIfUserExists(ctx, q, emailNullStr)
	if err != nil {
		logger.Error("Database error. Scenario: AS.7", "error", err.Error())
		return nil, fmt.Errorf("%w: %w", ErrEmailCheckFailed, err)
	}

	if exists {
		logger.Info("Attempt to register user with existing email. Scenario: AS.9", "email", req.Email)
		return nil, ErrEmailTaken
	}

	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrPasswordHashFailed, err)
	}

	roleID, err := q.GetRoleIDByName(ctx, req.Role)
	if err != nil {
		logger.Error("Failed to resolve role", "error", err.Error(), "role", req.Role)
		return nil, fmt.Errorf("%w: %w", ErrInvalidRole, err)
	}

	var inviteCodeID int32
	if req.Role == string(dtos.Teacher) {
		inviteCodeID, err = redeemTeacherInvite(ctx, q, req.InviteCode)
		if err != nil {
			return nil, err
		}
	}

	createParams := generated.CreateUserParams{
		FirstName: strings.TrimSpace(req.FirstName),
		LastName:  strings.TrimSpace(req.LastName),
		Email:     emailNullStr,
		Password:  sql.NullString{String: passwordHash, Valid: true},
		RoleID:    roleID,
		SchoolID:  sql.NullInt32{Valid: false},
	}

	createdUser, err := q.CreateUser(ctx, createParams)
	if err != nil {
		logger.Error("Failed to create user", "error", err.Error())
		if inviteCodeID != 0 {
			releaseTeacherInvite(ctx, q, inviteCodeID)
		}
		return nil, fmt.Errorf("%w: %w", ErrUserCreateFailed, err)
	}

	if err := CreateDefaultKeyboardBindings(ctx, q, int(createdUser.ID)); err != nil {
		logger.Error("Failed to seed default keyboard bindings for new user",
			"error", err.Error(),
			"user_id", createdUser.ID)
	}

	return &dtos.RegisterResponse{
		Message: "User created successfully",
		User:    convertCreateUserRowToUserResponse(createdUser, req.Role),
	}, nil
}

func checkIfUserExists(ctx context.Context, q generated.Querier, email sql.NullString) (bool, error) {
	_, err := q.GetUserByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("database error: %w", err)
	}
	return true, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func getLockoutDuration() time.Duration {
	if val := os.Getenv("ACCOUNT_LOCKOUT_DURATION_MINUTES"); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil {
			return time.Duration(parsed) * time.Minute
		}
	}
	return DefaultLockoutDurationMinutes * time.Minute
}

// RefreshToken validates a refresh token and, if valid, mints a fresh
// access token. q is unused today (validation is pure JWT verification)
// but kept for signature consistency with the rest of the service layer.
func RefreshToken(refreshToken string) (string, error) {
	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(refreshToken, claims, func(token *jwt.Token) (any, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return middleware.GetJWTSecret(), nil
	})

	if err != nil || !token.Valid {
		return "", ErrInvalidRefreshToken
	}

	// Verify it's actually a refresh token
	if claims.TokenType != "refresh" {
		return "", ErrWrongTokenType
	}

	newAccessToken, err := middleware.GenerateAccessToken(claims.UserID)
	if err != nil {
		return "", fmt.Errorf("%w: %w", ErrAccessTokenGeneration, err)
	}

	return newAccessToken, nil
}
