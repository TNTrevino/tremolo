package services

import (
	"database/sql"
	"net/http"
	"os"
	"strings"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/logger"
	"sight-reading/middleware"

	"github.com/gin-gonic/gin"
)

var (
	googleClientID     string
	googleClientSecret string
	tokenVerifier      GoogleTokenVerifier
)

// InitGoogleOAuth loads Google OAuth configuration from environment variables.
// Must be called during application startup.
func InitGoogleOAuth() {
	googleClientID = os.Getenv("GOOGLE_CLIENT_ID")
	if googleClientID == "" {
		panic("GOOGLE_CLIENT_ID environment variable is required")
	}
	googleClientSecret = os.Getenv("GOOGLE_CLIENT_SECRET")
	if googleClientSecret == "" {
		panic("GOOGLE_CLIENT_SECRET environment variable is required")
	}
	tokenVerifier = &googleTokenVerifierImpl{}
}

// SetTokenVerifier allows replacing the token verifier for testing.
func SetTokenVerifier(v GoogleTokenVerifier) {
	tokenVerifier = v
}

// GoogleCallback handles the OAuth callback from the frontend.
// It exchanges the authorization code, verifies the ID token, and either:
// 1. Logs in an existing Google user
// 2. Links Google to an existing email user (auto-link)
// 3. Creates a new user with BASIC role
func GoogleCallback(c *gin.Context) {
	var reqBody dtos.GoogleCallbackRequest
	if err := c.ShouldBindJSON(&reqBody); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := reqBody.ValidateGoogleCallbackRequest(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Exchange authorization code for ID token
	idTokenStr, err := tokenVerifier.ExchangeCode(reqBody.Code, reqBody.RedirectURI)
	if err != nil {
		logger.Error("Failed to exchange Google authorization code", "error", err.Error())
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization code"})
		return
	}

	// Verify the ID token
	claims, err := tokenVerifier.VerifyIDToken(idTokenStr)
	if err != nil {
		logger.Error("Failed to verify Google ID token", "error", err.Error())
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Google token"})
		return
	}

	if !claims.EmailVerified {
		c.JSON(http.StatusForbidden, gin.H{"error": "Google email is not verified"})
		return
	}

	ctx := c.Request.Context()
	normalizedEmail := normalizeEmail(claims.Email)

	// Scenario 1: Check if user exists by Google ID
	user, err := database.Queries.GetUserByGoogleID(ctx, sql.NullString{String: claims.Sub, Valid: true})
	if err == nil {
		// Returning Google user — issue tokens
		issueTokensAndRespond(c, convertGetUserByGoogleIDRowToUserResponse(user), false)
		return
	}
	if err != sql.ErrNoRows {
		logger.Error("Database error looking up user by Google ID", "error", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	// Scenario 2: Check if user exists by email
	emailNullStr := sql.NullString{String: normalizedEmail, Valid: true}
	existingUser, err := database.Queries.GetUserByEmailForOAuth(ctx, emailNullStr)
	if err == nil {
		// User exists with this email — auto-link Google account
		if existingUser.GoogleID.Valid && existingUser.GoogleID.String != "" {
			// Already linked to a different Google account
			c.JSON(http.StatusConflict, gin.H{"error": "Email is already linked to a different Google account"})
			return
		}

		linkParams := generated.LinkGoogleAccountParams{
			GoogleID: sql.NullString{String: claims.Sub, Valid: true},
			ID:       existingUser.ID,
		}
		if err := database.Queries.LinkGoogleAccount(ctx, linkParams); err != nil {
			logger.Error("Failed to link Google account", "error", err.Error())
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link Google account"})
			return
		}
		logger.Info("Auto-linked Google account to existing user", "email", normalizedEmail)
		userResp := convertGetUserByEmailForOAuthRowToUserResponse(existingUser)
		userResp.HasGoogle = true
		issueTokensAndRespond(c, userResp, true)
		return
	}
	if err != sql.ErrNoRows {
		logger.Error("Database error looking up user by email", "error", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	// Scenario 3: New user — auto-register with BASIC role
	firstName := claims.GivenName
	if firstName == "" {
		firstName = "User"
	}
	lastName := claims.FamilyName
	if lastName == "" {
		parts := strings.Split(normalizedEmail, "@")
		lastName = parts[0]
	}

	roleID, err := database.Queries.GetRoleIDByName(ctx, "BASIC")
	if err != nil {
		logger.Error("Failed to resolve BASIC role", "error", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	createParams := generated.CreateOAuthUserParams{
		FirstName: firstName,
		LastName:  lastName,
		Email:     emailNullStr,
		GoogleID:  sql.NullString{String: claims.Sub, Valid: true},
		RoleID:    roleID,
		SchoolID:  sql.NullInt32{Valid: false},
	}

	newUser, err := database.Queries.CreateOAuthUser(ctx, createParams)
	if err != nil {
		logger.Error("Failed to create OAuth user", "error", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
		return
	}

	if err := CreateDefaultKeyboardBindings(ctx, database.Queries, int(newUser.ID)); err != nil {
		logger.Error("Failed to seed default keyboard bindings for OAuth user",
			"error", err.Error(), "user_id", newUser.ID)
	}

	logger.Info("Created new OAuth user", "email", normalizedEmail, "user_id", newUser.ID)
	userResp := dtos.UserResponse{
		ID:        int(newUser.ID),
		Email:     newUser.Email.String,
		FirstName: newUser.FirstName,
		LastName:  newUser.LastName,
		Role:      "BASIC",
		HasGoogle: true,
	}
	issueTokensAndRespond(c, userResp, false)
}

// LinkGoogleAccount allows an authenticated user to link their Google account.
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

	if err := reqBody.ValidateGoogleCallbackRequest(); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	idTokenStr, err := tokenVerifier.ExchangeCode(reqBody.Code, reqBody.RedirectURI)
	if err != nil {
		logger.Error("Failed to exchange Google authorization code for link", "error", err.Error())
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization code"})
		return
	}

	claims, err := tokenVerifier.VerifyIDToken(idTokenStr)
	if err != nil {
		logger.Error("Failed to verify Google ID token for link", "error", err.Error())
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Google token"})
		return
	}

	if !claims.EmailVerified {
		c.JSON(http.StatusForbidden, gin.H{"error": "Google email is not verified"})
		return
	}

	ctx := c.Request.Context()

	// Verify the authenticated user's email matches the Google email
	currentUser, err := database.Queries.GetUserByID(ctx, int32(uid))
	if err != nil {
		logger.Error("Failed to look up authenticated user for Google link", "error", err.Error(), "user_id", uid)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	if normalizeEmail(currentUser.Email.String) != normalizeEmail(claims.Email) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Google email does not match your account email"})
		return
	}

	// Check no other user has this Google ID
	_, err = database.Queries.GetUserByGoogleID(ctx, sql.NullString{String: claims.Sub, Valid: true})
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "This Google account is already linked to another user"})
		return
	}
	if err != sql.ErrNoRows {
		logger.Error("Database error checking Google ID uniqueness", "error", err.Error(), "user_id", uid)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Internal server error"})
		return
	}

	linkParams := generated.LinkGoogleAccountParams{
		GoogleID: sql.NullString{String: claims.Sub, Valid: true},
		ID:       int32(uid),
	}
	if err := database.Queries.LinkGoogleAccount(ctx, linkParams); err != nil {
		logger.Error("Failed to link Google account", "error", err.Error())
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to link Google account"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Google account linked successfully"})
}

// issueTokensAndRespond generates JWT tokens and sends the login response.
func issueTokensAndRespond(c *gin.Context, user dtos.UserResponse, accountLinked bool) {
	accessToken, err := middleware.GenerateAccessToken(user.ID)
	if err != nil {
		logger.Error("Failed to generate access token", "error", err.Error(), "user_id", user.ID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate access token"})
		return
	}

	refreshToken, err := middleware.GenerateRefreshToken(user.ID)
	if err != nil {
		logger.Error("Failed to generate refresh token", "error", err.Error(), "user_id", user.ID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate refresh token"})
		return
	}

	response := dtos.LoginResponse{
		User:          user,
		AccessToken:   accessToken,
		RefreshToken:  refreshToken,
		AccountLinked: accountLinked,
	}

	c.JSON(http.StatusOK, response)
}
