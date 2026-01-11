// Package middleware contains all the middleware that the application uses.
// Current middleware:
// - JWT Auth
package middleware

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"sight-reading/logger"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret []byte

func InitJWTSecret() {
	secretStr := os.Getenv("JWT_SECRET")
	if secretStr == "" {
		log.Panic("JWT Secret not found. Please read the README and add one.")
	}

	if len(secretStr) < 32 {
		log.Panic("JWT_SECRET must be at least 32 characters long for security purposes: " + fmt.Sprint(len(secretStr)))
	}

	jwtSecret = []byte(secretStr)

	// check
	getEnvInt("ACCESS_TOKEN_EXPIRY_MINUTES")
	getEnvInt("REFRESH_TOKEN_EXPIRY_HOURS")
}

// getEnvInt retrieves an integer environment variable
// panics if that variable is not set
func getEnvInt(key string) int {
	if val := os.Getenv(key); val != "" {
		if parsed, err := strconv.Atoi(val); err == nil {
			return parsed
		}
	}
	logger.Error("Environment variable " + key + " is not set or is not a valid integer")
	panic("Environment variable " + key + " is not set or is not a valid integer")
}

// Claims represents the JWT claims structure
type Claims struct {
	UserID    int    `json:"user_id"`
	TokenType string `json:"token_type"` // "access" or "refresh"
	jwt.RegisteredClaims
}

// GenerateAccessToken generates a short-lived JWT access token for a user
func GenerateAccessToken(userID int) (string, error) {
	expiryMinutes := getEnvInt("ACCESS_TOKEN_EXPIRY_MINUTES")
	expirationTime := time.Now().Add(time.Duration(expiryMinutes) * time.Minute)

	claims := &Claims{
		UserID:    userID,
		TokenType: "access",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign access token: %w", err)
	}

	return tokenString, nil
}

// GenerateRefreshToken generates a long-lived JWT refresh token for a user
func GenerateRefreshToken(userID int) (string, error) {
	expiryHours := getEnvInt("REFRESH_TOKEN_EXPIRY_HOURS")
	expirationTime := time.Now().Add(time.Duration(expiryHours) * time.Hour)

	claims := &Claims{
		UserID:    userID,
		TokenType: "refresh",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign refresh token: %w", err)
	}

	return tokenString, nil
}

// GetJWTSecret returns the JWT secret for use in services
func GetJWTSecret() []byte {
	return jwtSecret
}

// AuthMiddleware validates JWT tokens and adds user ID to context
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized",
			})
			c.Abort()
			return
		}

		// Expected format: "Bearer <token>"
		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized",
			})
			c.Abort()
			return
		}

		tokenString := parts[1]

		// Parse and validate token
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) { // TODO: what is going on here?
			// Verify signing method
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok { // if initialization; condition
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return jwtSecret, nil
		})
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized",
			})
			c.Abort()
			return
		}

		if !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Unauthorized",
			})
			c.Abort()
			return
		}

		// verify its an access and not a refresh token
		if claims.TokenType != "access" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token type",
			})
			c.Abort()
			return
		}

		// add user id to context
		c.Set("userID", claims.UserID)
		c.Next()
	}
}
