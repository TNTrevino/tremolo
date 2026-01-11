// Package services provides authentication and user management functionality
package services

import (
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"sight-reading/logger"
	"sight-reading/middleware"
	"sight-reading/repositories"
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
	userRepo := repositories.NewUserRepository()

	isLocked, lockedUntil, err := userRepo.CheckAccountLocked(normalizedEmail)
	if err != nil {
		logger.Error("Error checking account lock status", "error", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    "Internal server error.",
			"scenario": "AS.10",
		})
		return
	}

	if isLocked && lockedUntil != nil {
		logger.Info("Login attempt on locked account", "email", normalizedEmail)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":    "Account is locked due to too many failed login attempts",
			"scenario": "AS.11",
		})
		return
	}

	user, err := userRepo.GetUserByEmail(normalizedEmail)
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

	if !user.PasswordHash.Valid || user.PasswordHash.String == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid credentials",
		})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash.String), []byte(reqBody.Password))
	if err != nil {
		logger.Info("Invalid password, incrementing failed attempts", "error", err.Error())
		if err := userRepo.IncrementFailedAttempts(normalizedEmail); err != nil {
			logger.Error("Failed to increment failed attempts", "error", err.Error())
		}

		attempts, err := userRepo.GetFailedAttempts(normalizedEmail)
		if err != nil {
			logger.Error("Failed to get failed attempts", "error", err.Error())
		} else {
			maxAttempts := getMaxLoginAttempts()
			if attempts >= maxAttempts {
				lockDuration := getLockoutDuration()
				lockedUntil := time.Now().Add(lockDuration)
				if err := userRepo.LockAccount(normalizedEmail, lockedUntil); err != nil {
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

	if err := userRepo.ResetLockout(normalizedEmail); err != nil {
		logger.Error("Failed to reset lockout", "error", err.Error())
	}

	accessToken, err := middleware.GenerateAccessToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate access token",
		})
		return
	}

	refreshToken, err := middleware.GenerateRefreshToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate refresh token",
		})
		return
	}

	response := dtos.LoginResponse{
		User: dtos.UserResponse{
			ID:        user.ID,
			Email:     user.Email,
			FirstName: user.FirstName,
			LastName:  user.LastName,
			Role:      user.Role,
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

	userRepo := repositories.NewUserRepository()
	user, err := userRepo.GetUserByID(uid)
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
		ID:        user.ID,
		Email:     user.Email,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      user.Role,
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
	userRepo := repositories.NewUserRepository()

	exists, err := checkIfUserExists(userRepo, normalizedEmail)
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

	user := repositories.User{
		Email:     normalizedEmail,
		FirstName: reqBody.FirstName,
		LastName:  reqBody.LastName,
		Role:      reqBody.Role,
	}
	user.PasswordHash.Valid = true
	user.PasswordHash.String = passwordHash

	createdUser, err := userRepo.CreateUser(user)
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
			ID:        createdUser.ID,
			Email:     createdUser.Email,
			FirstName: createdUser.FirstName,
			LastName:  createdUser.LastName,
			Role:      createdUser.Role,
		},
	}

	c.JSON(http.StatusCreated, response)
}

func checkIfUserExists(userRepo *repositories.UserRepository, email string) (bool, error) {
	_, err := userRepo.GetUserByEmail(email)

	if err == nil {
		return true, nil
	} else if err != sql.ErrNoRows {
		return false, fmt.Errorf("database error: %w", err)
	}
	return false, nil
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
