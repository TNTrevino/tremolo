// Package middleware contains all the middleware that the application uses.
// Current middleware:
// - JWT Auth
package middleware

import (
	"errors"
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

const (
	// MinJWTSecretLength is the minimum required length for JWT secret for security
	MinJWTSecretLength = 32

	// BearerTokenParts is the expected number of parts in a Bearer token ("Bearer" + token)
	BearerTokenParts = 2
)

func InitJWTSecret() {
	secretStr := os.Getenv("JWT_SECRET")
	if secretStr == "" {
		log.Panic("JWT Secret not found. Please read the README and add one.")
	}

	if len(secretStr) < MinJWTSecretLength {
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

// errWrongTokenType marks a token that parses and verifies but is a
// refresh token presented where an access token is required. It is the one
// failure the middleware reports differently, so the two implementations
// below both need to tell it apart from a plain rejection.
var errWrongTokenType = errors.New("token is not an access token")

// accessTokenClaims validates an Authorization header and returns the
// claims it carries. It is the shared core of the gin middleware and the
// net/http one, so a token accepted by one is accepted by the other.
//
// Every failure except errWrongTokenType is deliberately
// indistinguishable: a missing header, a malformed header, a bad
// signature and an expired token all return the same error, so nothing
// about why the token failed leaks to the caller.
func accessTokenClaims(authHeader string) (*Claims, error) {
	if authHeader == "" {
		return nil, errors.New("missing authorization header")
	}

	// Expected format: "Bearer <token>"
	parts := strings.Split(authHeader, " ")
	if len(parts) != BearerTokenParts || parts[0] != "Bearer" {
		return nil, errors.New("malformed authorization header")
	}

	claims := &Claims{}
	token, err := jwt.ParseWithClaims(parts[1], claims, func(token *jwt.Token) (any, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return jwtSecret, nil
	})
	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, errors.New("invalid token")
	}

	// verify its an access and not a refresh token
	if claims.TokenType != "access" {
		return nil, errWrongTokenType
	}

	return claims, nil
}

// GetAuthenticatedUserID extracts and validates the authenticated user ID from the Gin context
// This is a helper function to reduce boilerplate in handlers that use AuthMiddleware
// Returns the user ID or an error if extraction fails
// Callers are responsible for handling the error and setting appropriate HTTP responses
func GetAuthenticatedUserID(c *gin.Context) (int, error) {
	userIDInterface, exists := c.Get("userID")
	if !exists {
		return 0, errors.New("Unauthorized")
	}

	authenticatedUserID, ok := userIDInterface.(int)
	if !ok {
		return 0, errors.New("Unauthorized")
	}

	return authenticatedUserID, nil
}

// AuthMiddleware validates JWT tokens and adds user ID to context.
//
// Deprecated: this is the gin implementation, kept only while routes are
// still served by the mounted gin fallback. Converted routes use
// RequireAuth. Delete it with the fallback.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, err := accessTokenClaims(c.GetHeader("Authorization"))
		if err != nil {
			message := "Unauthorized"
			if errors.Is(err, errWrongTokenType) {
				message = "Invalid token type"
			}
			c.JSON(http.StatusUnauthorized, gin.H{"error": message})
			c.Abort()
			return
		}

		// add user id to context
		c.Set("userID", claims.UserID)
		c.Next()
	}
}
