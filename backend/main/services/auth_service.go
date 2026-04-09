// Package services provides authentication and user management functionality
package services

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/logger"
	"sight-reading/middleware"
	"strconv"
	"strings"
	"time"

	dtos "sight-reading/DTOs"

	"github.com/gin-gonic/gin"
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

func Login(c *gin.Context) {
	var reqBody dtos.LoginRequest

	err := c.ShouldBindJSON(&reqBody)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	err = reqBody.ValidateLoginRequest()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	normalizedEmail := normalizeEmail(reqBody.Email)
	emailNullStr := sql.NullString{String: normalizedEmail, Valid: true}
	ctx := c.Request.Context()

	lockedUntil, err := database.Queries.CheckAccountLocked(ctx, emailNullStr)
	if err != nil && err != sql.ErrNoRows {
		logger.Error("Error checking account lock status", "error", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    "Internal server error.",
			"scenario": "AS.10",
		})
		return
	}

	if lockedUntil.Valid {
		logger.Info("Login attempt on locked account", "email", normalizedEmail)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":    "Account is locked due to too many failed login attempts",
			"scenario": "AS.11",
		})
		return
	}

	user, err := database.Queries.GetUserByEmail(ctx, emailNullStr)
	if err != nil {
		if err == sql.ErrNoRows {
			logger.Info("User not found with provided", "email", normalizedEmail)
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid credentials",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    "Internal server error",
			"scenario": "AS.12",
		})
		return
	}

	if user.Password == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid credentials",
		})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(reqBody.Password))
	if err != nil {
		logger.Info("Invalid password, incrementing failed attempts", "error", err.Error())
		if err := database.Queries.IncrementFailedAttempts(ctx, emailNullStr); err != nil {
			logger.Error("Failed to increment failed attempts", "error", err.Error())
		}

		attempts, err := database.Queries.GetFailedAttempts(ctx, emailNullStr)
		if err != nil {
			logger.Error("Failed to get failed attempts", "error", err.Error())
		} else {
			if int(attempts) >= MaxLoginAttempts {
				lockDuration := getLockoutDuration()
				lockedUntilTime := time.Now().Add(lockDuration)
				lockParams := generated.LockAccountParams{
					LockedUntil: sql.NullTime{Time: lockedUntilTime, Valid: true},
					Email:       emailNullStr,
				}
				if err := database.Queries.LockAccount(ctx, lockParams); err != nil {
					logger.Error("Failed to lock account", "error", err.Error())
				} else {
					logger.Info("Account locked due to failed login attempts", "email", normalizedEmail, "attempts", attempts)
					c.JSON(http.StatusUnauthorized, gin.H{
						"error": fmt.Sprintf("Account locked for %d minutes due to too many failed login attempts", int(lockDuration.Minutes())),
					})
					return
				}
			}
		}

		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid credentials",
		})
		return
	}

	if err := database.Queries.ResetLockout(ctx, emailNullStr); err != nil {
		logger.Error("Failed to reset lockout", "error", err.Error())
	}

	accessToken, err := middleware.GenerateAccessToken(int(user.ID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate access token",
		})
		return
	}

	refreshToken, err := middleware.GenerateRefreshToken(int(user.ID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate refresh token",
		})
		return
	}

	response := dtos.LoginResponse{
		User:         convertGetUserByEmailRowToUserResponse(user),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}

	c.JSON(http.StatusOK, response)
}

func GetCurrentUser(c *gin.Context) {
	uid, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	ctx := c.Request.Context()
	user, err := database.Queries.GetUserByID(ctx, int32(uid))
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    "Internal server error",
			"scenario": "AS.6",
		})
		return
	}

	response := convertGetUserByIDRowToUserResponse(user)
	c.JSON(http.StatusOK, response)
}

func HashPassword(password string) (string, error) {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), BcryptCost)
	if err != nil {
		return "", fmt.Errorf("failed to hash password: %w", err)
	}
	return string(hashedBytes), nil
}

func Register(c *gin.Context) {
	var reqBody dtos.RegisterRequest

	err := c.ShouldBindJSON(&reqBody)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	err = reqBody.ValidateRegisterRequest()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	normalizedEmail := normalizeEmail(reqBody.Email)
	emailNullStr := sql.NullString{String: normalizedEmail, Valid: true}
	ctx := c.Request.Context()

	exists, err := checkIfUserExists(ctx, database.Queries, emailNullStr)
	if err != nil {
		logger.Error("Database error. Scenario: AS.7", "error", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    "Internal server error.",
			"scenario": "AS.8",
		})
		return
	}

	if exists {
		logger.Info("Attempt to register user with existing email. Scenario: AS.9", "email", reqBody.Email)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Email already exists",
		})
		return
	}

	passwordHash, err := HashPassword(reqBody.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process password",
		})
		return
	}

	roleID, err := database.Queries.GetRoleIDByName(ctx, reqBody.Role)
	if err != nil {
		logger.Error("Failed to resolve role", "error", err.Error(), "role", reqBody.Role)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid role",
		})
		return
	}

	createParams := generated.CreateUserParams{
		FirstName: reqBody.FirstName,
		LastName:  reqBody.LastName,
		Email:     emailNullStr,
		Password:  sql.NullString{String: passwordHash, Valid: true},
		RoleID:    roleID,
		SchoolID:  sql.NullInt32{Valid: false},
	}

	createdUser, err := database.Queries.CreateUser(ctx, createParams)
	if err != nil {
		logger.Error("Failed to create user", "error", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create user",
		})
		return
	}

	if err := CreateDefaultKeyboardBindings(ctx, database.Queries, int(createdUser.ID)); err != nil {
		logger.Error("Failed to seed default keyboard bindings for new user",
			"error", err.Error(),
			"user_id", createdUser.ID)
	}

	response := dtos.RegisterResponse{
		Message: "User created successfully",
		User:    convertCreateUserRowToUserResponse(createdUser, reqBody.Role),
	}

	c.JSON(http.StatusCreated, response)
}

func checkIfUserExists(ctx context.Context, q generated.Querier, email sql.NullString) (bool, error) {
	_, err := q.GetUserByEmail(ctx, email)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, fmt.Errorf("database error: %w", err)
	}
	return true, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(email)
}

func getLockoutDuration() time.Duration {
	if val := os.Getenv("ACCOUNT_LOCKOUT_DURATION_MINUTES"); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil {
			return time.Duration(parsed) * time.Minute
		}
	}
	return DefaultLockoutDurationMinutes * time.Minute
}

func RefreshToken(c *gin.Context) {
	var reqBody struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Refresh token is required",
		})
		return
	}

	// validate refresh token
	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(reqBody.RefreshToken, claims, func(token *jwt.Token) (any, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return middleware.GetJWTSecret(), nil
	})

	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid refresh token",
		})
		return
	}

	// Verify its actually a refresh token
	if claims.TokenType != "refresh" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid token type",
		})
		return
	}

	newAccessToken, err := middleware.GenerateAccessToken(claims.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate access token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": newAccessToken,
	})
}
