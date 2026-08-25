package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"strings"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
	"sight-reading/middleware"
)

// InitGoogleOAuth reads the Google OAuth client credentials from the
// environment and constructs the production token verifier. Must be
// called during application startup; panics if a required env var is
// missing. It returns the verifier rather than storing it in a package
// global -- the caller (controllers.InitGoogleOAuth) owns wiring it into
// the Google route handlers.
func InitGoogleOAuth() GoogleTokenVerifier {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	if clientID == "" {
		panic("GOOGLE_CLIENT_ID environment variable is required")
	}
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	if clientSecret == "" {
		panic("GOOGLE_CLIENT_SECRET environment variable is required")
	}
	return NewGoogleTokenVerifier(clientID, clientSecret)
}

// GoogleCallback handles the OAuth callback from the frontend. It exchanges
// the authorization code, verifies the ID token, and either:
//  1. Logs in an existing Google user
//  2. Links Google to an existing email user (auto-link)
//  3. Creates a new user with BASIC role
func GoogleCallback(ctx context.Context, q generated.Querier, verifier GoogleTokenVerifier, req dtos.GoogleCallbackRequest) (*dtos.LoginResponse, error) {
	idTokenStr, err := verifier.ExchangeCode(ctx, req.Code, req.RedirectURI)
	if err != nil {
		logger.Error("Failed to exchange Google authorization code", "error", err.Error())
		return nil, fmt.Errorf("%w: %w", ErrGoogleExchangeFailed, err)
	}

	claims, err := verifier.VerifyIDToken(ctx, idTokenStr)
	if err != nil {
		logger.Error("Failed to verify Google ID token", "error", err.Error())
		return nil, fmt.Errorf("%w: %w", ErrGoogleTokenInvalid, err)
	}

	if !claims.EmailVerified {
		return nil, ErrGoogleEmailUnverified
	}

	normalizedEmail := normalizeEmail(claims.Email)

	// Scenario 1: check if user exists by Google ID
	user, err := q.GetUserByGoogleID(ctx, sql.NullString{String: claims.Sub, Valid: true})
	if err == nil {
		return issueGoogleLoginResponse(convertGetUserByGoogleIDRowToUserResponse(user), false)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		logger.Error("Database error looking up user by Google ID", "error", err.Error())
		return nil, fmt.Errorf("look up user by google id: %w", err)
	}

	// Scenario 2: check if user exists by email
	emailNullStr := sql.NullString{String: normalizedEmail, Valid: true}
	existingUser, err := q.GetUserByEmailForOAuth(ctx, emailNullStr)
	if err == nil {
		// User exists with this email -- auto-link Google account
		if existingUser.GoogleID.Valid && existingUser.GoogleID.String != "" {
			// Already linked to a different Google account
			return nil, ErrGoogleEmailAlreadyLinked
		}

		linkParams := generated.LinkGoogleAccountParams{
			GoogleID: sql.NullString{String: claims.Sub, Valid: true},
			ID:       existingUser.ID,
		}
		if err := q.LinkGoogleAccount(ctx, linkParams); err != nil {
			logger.Error("Failed to link Google account", "error", err.Error())
			return nil, fmt.Errorf("%w: %w", ErrGoogleLinkFailed, err)
		}
		logger.Info("Auto-linked Google account to existing user", "email", normalizedEmail)

		// Best effort: the auto-linked address was already verified by
		// Google (claims.EmailVerified checked above), and sign-in must
		// not fail on this bookkeeping.
		if err := q.MarkEmailVerified(ctx, existingUser.ID); err != nil {
			logger.Error("Failed to mark email verified after Google auto-link", "error", err.Error(), "user_id", existingUser.ID)
		}

		userResp := convertGetUserByEmailForOAuthRowToUserResponse(existingUser)
		userResp.HasGoogle = true
		return issueGoogleLoginResponse(userResp, true)
	}
	if !errors.Is(err, sql.ErrNoRows) {
		logger.Error("Database error looking up user by email", "error", err.Error())
		return nil, fmt.Errorf("look up user by email for oauth: %w", err)
	}

	// Scenario 3: new user -- auto-register with BASIC role
	firstName := strings.TrimSpace(claims.GivenName)
	if firstName == "" {
		firstName = "User"
	}
	lastName := strings.TrimSpace(claims.FamilyName)
	if lastName == "" {
		parts := strings.Split(normalizedEmail, "@")
		lastName = parts[0]
	}

	roleID, err := q.GetRoleIDByName(ctx, "BASIC")
	if err != nil {
		logger.Error("Failed to resolve BASIC role", "error", err.Error())
		return nil, fmt.Errorf("resolve basic role for oauth user: %w", err)
	}

	createParams := generated.CreateOAuthUserParams{
		FirstName: firstName,
		LastName:  lastName,
		Email:     emailNullStr,
		GoogleID:  sql.NullString{String: claims.Sub, Valid: true},
		RoleID:    roleID,
		SchoolID:  sql.NullInt32{Valid: false},
	}

	newUser, err := q.CreateOAuthUser(ctx, createParams)
	if err != nil {
		logger.Error("Failed to create OAuth user", "error", err.Error())
		return nil, fmt.Errorf("%w: %w", ErrGoogleUserCreateFailed, err)
	}

	if err := CreateDefaultKeyboardBindings(ctx, q, int(newUser.ID)); err != nil {
		logger.Error("Failed to seed default keyboard bindings for OAuth user",
			"error", err.Error(), "user_id", newUser.ID)
	}

	// Best effort, same reasoning as the auto-link branch above: a brand
	// new Google-authenticated account is verified by construction, and
	// sign-in must not fail on this bookkeeping.
	if err := q.MarkEmailVerified(ctx, newUser.ID); err != nil {
		logger.Error("Failed to mark email verified for new OAuth user", "error", err.Error(), "user_id", newUser.ID)
	}

	logger.Info("Created new OAuth user", "email", normalizedEmail, "user_id", newUser.ID)
	userResp := dtos.UserResponse{
		ID:        int(newUser.ID),
		Email:     newUser.Email.String,
		FirstName: newUser.FirstName,
		LastName:  newUser.LastName,
		Role:      "BASIC",
		HasGoogle: true,
		// Verified by construction, same as every other Google-authenticated
		// response in this file -- see convertGetUserByGoogleIDRowToUserResponse.
		EmailVerified: true,
	}
	return issueGoogleLoginResponse(userResp, false)
}

// LinkGoogleAccount allows an authenticated user to link their Google
// account. userID is the caller's own ID (from the auth middleware).
func LinkGoogleAccount(ctx context.Context, q generated.Querier, verifier GoogleTokenVerifier, userID int, req dtos.GoogleCallbackRequest) error {
	idTokenStr, err := verifier.ExchangeCode(ctx, req.Code, req.RedirectURI)
	if err != nil {
		logger.Error("Failed to exchange Google authorization code for link", "error", err.Error())
		return fmt.Errorf("%w: %w", ErrGoogleExchangeFailed, err)
	}

	claims, err := verifier.VerifyIDToken(ctx, idTokenStr)
	if err != nil {
		logger.Error("Failed to verify Google ID token for link", "error", err.Error())
		return fmt.Errorf("%w: %w", ErrGoogleTokenInvalid, err)
	}

	if !claims.EmailVerified {
		return ErrGoogleEmailUnverified
	}

	// Verify the authenticated user's email matches the Google email
	currentUser, err := q.GetUserByID(ctx, int32(userID))
	if err != nil {
		logger.Error("Failed to look up authenticated user for Google link", "error", err.Error(), "user_id", userID)
		return fmt.Errorf("look up authenticated user for google link: %w", err)
	}

	if normalizeEmail(currentUser.Email.String) != normalizeEmail(claims.Email) {
		return ErrGoogleEmailMismatch
	}

	// Check no other user has this Google ID
	_, err = q.GetUserByGoogleID(ctx, sql.NullString{String: claims.Sub, Valid: true})
	if err == nil {
		return ErrGoogleIDConflict
	}
	if !errors.Is(err, sql.ErrNoRows) {
		logger.Error("Database error checking Google ID uniqueness", "error", err.Error(), "user_id", userID)
		return fmt.Errorf("check google id uniqueness: %w", err)
	}

	linkParams := generated.LinkGoogleAccountParams{
		GoogleID: sql.NullString{String: claims.Sub, Valid: true},
		ID:       int32(userID),
	}
	if err := q.LinkGoogleAccount(ctx, linkParams); err != nil {
		logger.Error("Failed to link Google account", "error", err.Error())
		return fmt.Errorf("%w: %w", ErrGoogleLinkFailed, err)
	}

	// Best effort, same reasoning as GoogleCallback's auto-link branch:
	// the email just matched claims.Email, which VerifyIDToken already
	// required to be Google-verified, and linking must not fail on this
	// bookkeeping.
	if err := q.MarkEmailVerified(ctx, int32(userID)); err != nil {
		logger.Error("Failed to mark email verified after explicit Google link", "error", err.Error(), "user_id", userID)
	}

	return nil
}

// issueGoogleLoginResponse mints a fresh access/refresh token pair for a
// Google-authenticated user and assembles the login response. It wraps
// ErrAccessTokenGeneration / ErrRefreshTokenGeneration on failure -- the
// same sentinels the email/password Login flow uses, so the controller
// shares one error mapping across both.
func issueGoogleLoginResponse(user dtos.UserResponse, accountLinked bool) (*dtos.LoginResponse, error) {
	accessToken, err := middleware.GenerateAccessToken(user.ID)
	if err != nil {
		logger.Error("Failed to generate access token", "error", err.Error(), "user_id", user.ID)
		return nil, fmt.Errorf("%w: %w", ErrAccessTokenGeneration, err)
	}

	refreshToken, err := middleware.GenerateRefreshToken(user.ID)
	if err != nil {
		logger.Error("Failed to generate refresh token", "error", err.Error(), "user_id", user.ID)
		return nil, fmt.Errorf("%w: %w", ErrRefreshTokenGeneration, err)
	}

	return &dtos.LoginResponse{
		User:          user,
		AccessToken:   accessToken,
		RefreshToken:  refreshToken,
		AccountLinked: accountLinked,
	}, nil
}
