package controllers

import (
	"errors"
	"net/http"
	"strings"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/logger"
	"sight-reading/middleware"
	"sight-reading/services"

	"github.com/gin-gonic/gin"
)

// SetupAuthRoutes registers the email/password and Google OAuth auth
// routes.
func SetupAuthRoutes(router *gin.Engine) {
	auth := router.Group("/api/auth")
	{
		auth.POST("/login", Login)
		auth.POST("/register", Register)
		auth.POST("/refresh", RefreshToken)

		auth.GET("/me", middleware.AuthMiddleware(), GetCurrentUser)

		// Google OAuth
		auth.POST("/google/callback", GoogleCallback)
		auth.POST("/google/link", middleware.AuthMiddleware(), LinkGoogleAccount)
	}
}

// googleTokenVerifier is the Google OAuth token verifier used by the
// Google route handlers below. It is wired at startup by InitGoogleOAuth
// (production) or swapped out by SetGoogleTokenVerifier (tests) -- the
// controller owns this dependency and passes it explicitly into the
// service calls, rather than the service layer reading it from a global.
var googleTokenVerifier services.GoogleTokenVerifier

// InitGoogleOAuth constructs the production Google token verifier from
// environment configuration and wires it into the Google route handlers.
// Must be called during application startup.
func InitGoogleOAuth() {
	googleTokenVerifier = services.InitGoogleOAuth()
}

// SetGoogleTokenVerifier allows tests to inject a fake Google token
// verifier in place of the production one.
func SetGoogleTokenVerifier(v services.GoogleTokenVerifier) {
	googleTokenVerifier = v
}

// GoogleCallback handles POST /api/auth/google/callback.
func GoogleCallback(c *gin.Context) {
	var reqBody dtos.GoogleCallbackRequest
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	result, err := services.GoogleCallback(c.Request.Context(), database.Queries, googleTokenVerifier, reqBody)
	if err != nil {
		respondGoogleAuthError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

// LinkGoogleAccount handles POST /api/auth/google/link.
// Protected: requires JWT authentication.
func LinkGoogleAccount(c *gin.Context) {
	uid, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var reqBody dtos.GoogleCallbackRequest
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := services.LinkGoogleAccount(c.Request.Context(), database.Queries, googleTokenVerifier, uid, reqBody); err != nil {
		respondGoogleAuthError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Google account linked successfully"})
}

// respondGoogleAuthError maps GoogleCallback's and LinkGoogleAccount's
// sentinel errors onto the exact response bodies the pre-refactor
// handlers produced, byte-for-byte -- the frontend matches on these
// shapes.
func respondGoogleAuthError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrValidation):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": strings.TrimPrefix(err.Error(), services.ErrValidation.Error()+": "),
		})
	case errors.Is(err, services.ErrGoogleExchangeFailed):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization code"})
	case errors.Is(err, services.ErrGoogleTokenInvalid):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Google token"})
	case errors.Is(err, services.ErrGoogleEmailUnverified):
		c.JSON(http.StatusForbidden, gin.H{"error": "Google email is not verified"})
	case errors.Is(err, services.ErrGoogleEmailAlreadyLinked):
		c.JSON(http.StatusConflict, gin.H{"error": "Email is already linked to a different Google account"})
	case errors.Is(err, services.ErrGoogleLinkFailed):
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link Google account"})
	case errors.Is(err, services.ErrGoogleUserCreateFailed):
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
	case errors.Is(err, services.ErrGoogleEmailMismatch):
		c.JSON(http.StatusForbidden, gin.H{"error": "Google email does not match your account email"})
	case errors.Is(err, services.ErrGoogleIDConflict):
		c.JSON(http.StatusConflict, gin.H{"error": "This Google account is already linked to another user"})
	case errors.Is(err, services.ErrAccessTokenGeneration):
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
	case errors.Is(err, services.ErrRefreshTokenGeneration):
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
	default:
		logger.Error("unexpected google auth error", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
	}
}

// Login handles POST /api/auth/login.
func Login(c *gin.Context) {
	var reqBody dtos.LoginRequest
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	result, err := services.Login(c.Request.Context(), database.Queries, reqBody)
	if err != nil {
		respondLoginError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

// respondLoginError maps Login's sentinel errors onto the exact response
// bodies the pre-refactor handler produced, byte-for-byte -- the
// frontend matches on these shapes.
func respondLoginError(c *gin.Context, err error) {
	var lockoutErr *services.LockoutTriggeredError

	switch {
	case errors.Is(err, services.ErrValidation):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": strings.TrimPrefix(err.Error(), services.ErrValidation.Error()+": "),
		})
	case errors.Is(err, services.ErrLockCheckFailed):
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    "Internal server error.",
			"scenario": "AS.10",
		})
	case errors.Is(err, services.ErrAccountLocked):
		c.JSON(http.StatusUnauthorized, gin.H{
			"error":    "Account is locked due to too many failed login attempts",
			"scenario": "AS.11",
		})
	case errors.As(err, &lockoutErr):
		c.JSON(http.StatusUnauthorized, gin.H{"error": lockoutErr.Error()})
	case errors.Is(err, services.ErrUserLookupFailed):
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    "Internal server error",
			"scenario": "AS.12",
		})
	case errors.Is(err, services.ErrInvalidCredentials):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
	case errors.Is(err, services.ErrAccessTokenGeneration):
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
	case errors.Is(err, services.ErrRefreshTokenGeneration):
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
	default:
		logger.Error("unexpected login error", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
	}
}

// Register handles POST /api/auth/register.
func Register(c *gin.Context) {
	var reqBody dtos.RegisterRequest
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	result, err := services.Register(c.Request.Context(), database.Queries, reqBody)
	if err != nil {
		respondRegisterError(c, err)
		return
	}

	c.JSON(http.StatusCreated, result)
}

// respondRegisterError maps Register's sentinel errors onto the exact
// response bodies the pre-refactor handler produced.
func respondRegisterError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrValidation):
		c.JSON(http.StatusBadRequest, gin.H{
			"error": strings.TrimPrefix(err.Error(), services.ErrValidation.Error()+": "),
		})
	case errors.Is(err, services.ErrEmailCheckFailed):
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    "Internal server error.",
			"scenario": "AS.8",
		})
	case errors.Is(err, services.ErrEmailTaken):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email already exists"})
	case errors.Is(err, services.ErrPasswordHashFailed):
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process password"})
	case errors.Is(err, services.ErrInvalidRole):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role"})
	case errors.Is(err, services.ErrUserCreateFailed):
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
	default:
		logger.Error("unexpected register error", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
	}
}

// GetCurrentUser handles GET /api/auth/me.
// Protected: Requires JWT authentication
func GetCurrentUser(c *gin.Context) {
	uid, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	result, err := services.GetCurrentUser(c.Request.Context(), database.Queries, uid)
	if err != nil {
		if errors.Is(err, services.ErrNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    "Internal server error",
			"scenario": "AS.6",
		})
		return
	}

	c.JSON(http.StatusOK, result)
}

// RefreshToken handles POST /api/auth/refresh.
func RefreshToken(c *gin.Context) {
	var reqBody struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Refresh token is required"})
		return
	}

	newAccessToken, err := services.RefreshToken(reqBody.RefreshToken)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidRefreshToken):
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid refresh token"})
		case errors.Is(err, services.ErrWrongTokenType):
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token type"})
		case errors.Is(err, services.ErrAccessTokenGeneration):
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		default:
			logger.Error("unexpected refresh token error", "error", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"access_token": newAccessToken,
	})
}
