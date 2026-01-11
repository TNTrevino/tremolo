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
			maxAttempts := getMaxLoginAttempts()
			if int(attempts) >= maxAttempts {
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
		User: dtos.UserResponse{
			ID:        int(user.ID),
			Email:     user.Email.String,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Role:      user.Role.String,
		},
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}

	c.JSON(http.StatusOK, response)
}

func GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}

	uid, ok := userID.(int)
	if !ok {
		logger.Error("Error parsing userID")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    "Internal server error",
			"scenario": "AS.5",
		})
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

	response := dtos.UserResponse{
		ID:        int(user.ID),
		Email:     user.Email.String,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      user.Role.String,
	}

	c.JSON(http.StatusOK, response)
}

func HashPassword(password string) (string, error) {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
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

	exists, err := checkIfUserExists(ctx, emailNullStr)
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

	createParams := generated.CreateUserParams{
		FirstName: reqBody.FirstName,
		LastName:  reqBody.LastName,
		Email:     emailNullStr,
		Password:  passwordHash,
		Role:      sql.NullString{String: reqBody.Role, Valid: true},
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

	response := dtos.RegisterResponse{
		Message: "User created successfully",
		User: dtos.UserResponse{
			ID:        int(createdUser.ID),
			Email:     createdUser.Email.String,
			FirstName: createdUser.FirstName,
			LastName:  createdUser.LastName,
			Role:      createdUser.Role.String,
		},
	}

	c.JSON(http.StatusCreated, response)
}

func checkIfUserExists(ctx context.Context, email sql.NullString) (bool, error) {
	_, err := database.Queries.GetUserByEmail(ctx, email)
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

func getMaxLoginAttempts() int {
	return 5
}

func getLockoutDuration() time.Duration {
	if val := os.Getenv("ACCOUNT_LOCKOUT_DURATION_MINUTES"); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil {
			return time.Duration(parsed) * time.Minute
		}
	}
	return 15 * time.Minute
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
	token, err := jwt.ParseWithClaims(reqBody.RefreshToken, claims, func(token *jwt.Token) (interface{}, error) {
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
