package controllers

import (
	"context"
	"errors"
	"net/http"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/httpx"
	"sight-reading/logger"
	"sight-reading/middleware"
	"sight-reading/services"
)

// RegisterAuthRoutes registers the email/password and Google OAuth auth
// routes.
func RegisterAuthRoutes(mux *http.ServeMux, q database.Querier) {
	mux.HandleFunc("POST /api/auth/login", handleLogin(q))
	mux.HandleFunc("POST /api/auth/register", handleRegister(q))
	mux.HandleFunc("POST /api/auth/refresh", handleRefreshToken())
	mux.HandleFunc("POST /api/auth/forgot-password", handleForgotPassword(q))
	mux.HandleFunc("POST /api/auth/reset-password", handleResetPassword(q))
	mux.HandleFunc("POST /api/auth/verify-email", handleVerifyEmail(q))
	mux.Handle("POST /api/auth/resend-verification", middleware.RequireAuth(handleResendVerification(q)))

	mux.Handle("GET /api/auth/me", middleware.RequireAuth(handleGetCurrentUser(q)))

	// Google OAuth
	mux.HandleFunc("POST /api/auth/google/callback", handleGoogleCallback(q))
	mux.Handle("POST /api/auth/google/link", middleware.RequireAuth(handleLinkGoogleAccount(q)))
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

// handleGoogleCallback handles POST /api/auth/google/callback.
// @Summary  Complete Google OAuth sign-in
// @Tags     auth
// @Accept   json
// @Produce  json
// @Param    callback body dtos.GoogleCallbackRequest true "Authorization code and redirect URI"
// @Success  200 {object} dtos.LoginResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body"
// @Failure  401 {object} dtos.ErrorResponse "Invalid authorization code or Google token"
// @Failure  403 {object} dtos.ErrorResponse "Google email is not verified"
// @Failure  409 {object} dtos.ErrorResponse "Email already linked to a different Google account"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/auth/google/callback [post]
func handleGoogleCallback(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqBody, problems, err := httpx.DecodeValid[dtos.GoogleCallbackRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		result, err := services.GoogleCallback(r.Context(), q, googleTokenVerifier, reqBody)
		if err != nil {
			respondGoogleAuthError(w, err)
			return
		}

		httpx.JSON(w, http.StatusOK, result)
	}
}

// handleLinkGoogleAccount handles POST /api/auth/google/link.
// Protected: requires JWT authentication.
// @Summary  Link a Google account
// @Tags     auth
// @Security BearerAuth
// @Accept   json
// @Produce  json
// @Param    callback body dtos.GoogleCallbackRequest true "Authorization code and redirect URI"
// @Success  200 {object} map[string]interface{} "message"
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body"
// @Failure  401 {object} dtos.ErrorResponse "Invalid authorization code, Google token, or unauthenticated"
// @Failure  403 {object} dtos.ErrorResponse "Email mismatch or unverified Google email"
// @Failure  409 {object} dtos.ErrorResponse "Google account already linked elsewhere"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/auth/google/link [post]
func handleLinkGoogleAccount(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := authedUserID(w, r)
		if !ok {
			return
		}

		reqBody, problems, err := httpx.DecodeValid[dtos.GoogleCallbackRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		if err := services.LinkGoogleAccount(r.Context(), q, googleTokenVerifier, uid, reqBody); err != nil {
			respondGoogleAuthError(w, err)
			return
		}

		httpx.JSON(w, http.StatusOK, httpx.M{"message": "Google account linked successfully"})
	}
}

// respondGoogleAuthError maps GoogleCallback's and LinkGoogleAccount's
// sentinel errors onto the exact response bodies the pre-refactor
// handlers produced, byte-for-byte -- the frontend matches on these
// shapes.
func respondGoogleAuthError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, services.ErrGoogleExchangeFailed):
		httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Invalid authorization code"})
	case errors.Is(err, services.ErrGoogleTokenInvalid):
		httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Invalid Google token"})
	case errors.Is(err, services.ErrGoogleEmailUnverified):
		httpx.JSON(w, http.StatusForbidden, httpx.M{"error": "Google email is not verified"})
	case errors.Is(err, services.ErrGoogleEmailAlreadyLinked):
		httpx.JSON(w, http.StatusConflict, httpx.M{"error": "Email is already linked to a different Google account"})
	case errors.Is(err, services.ErrGoogleLinkFailed):
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to link Google account"})
	case errors.Is(err, services.ErrGoogleUserCreateFailed):
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to create user"})
	case errors.Is(err, services.ErrGoogleEmailMismatch):
		httpx.JSON(w, http.StatusForbidden, httpx.M{"error": "Google email does not match your account email"})
	case errors.Is(err, services.ErrGoogleIDConflict):
		httpx.JSON(w, http.StatusConflict, httpx.M{"error": "This Google account is already linked to another user"})
	case errors.Is(err, services.ErrAccessTokenGeneration):
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to generate access token"})
	case errors.Is(err, services.ErrRefreshTokenGeneration):
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to generate refresh token"})
	default:
		logger.Error("unexpected google auth error", "error", err)
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Internal server error"})
	}
}

// handleLogin handles POST /api/auth/login.
// @Summary  Log in
// @Tags     auth
// @Accept   json
// @Produce  json
// @Param    credentials body dtos.LoginRequest true "Email and password"
// @Success  200 {object} dtos.LoginResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body or credentials"
// @Failure  401 {object} dtos.ErrorResponse "Invalid credentials or locked account"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/auth/login [post]
func handleLogin(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqBody, problems, err := httpx.DecodeValid[dtos.LoginRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		result, err := services.Login(r.Context(), q, reqBody)
		if err != nil {
			respondLoginError(w, err)
			return
		}

		httpx.JSON(w, http.StatusOK, result)
	}
}

// respondLoginError maps Login's sentinel errors onto the exact response
// bodies the pre-refactor handler produced, byte-for-byte -- the
// frontend matches on these shapes.
func respondLoginError(w http.ResponseWriter, err error) {
	var lockoutErr *services.LockoutTriggeredError

	switch {
	case errors.Is(err, services.ErrLockCheckFailed):
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{
			"error":    "Internal server error.",
			"scenario": "AS.10",
		})
	case errors.Is(err, services.ErrAccountLocked):
		httpx.JSON(w, http.StatusUnauthorized, httpx.M{
			"error":    "Account is locked due to too many failed login attempts",
			"scenario": "AS.11",
		})
	case errors.As(err, &lockoutErr):
		httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": lockoutErr.Error()})
	case errors.Is(err, services.ErrUserLookupFailed):
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{
			"error":    "Internal server error",
			"scenario": "AS.12",
		})
	case errors.Is(err, services.ErrInvalidCredentials):
		httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Invalid credentials"})
	case errors.Is(err, services.ErrAccessTokenGeneration):
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to generate access token"})
	case errors.Is(err, services.ErrRefreshTokenGeneration):
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to generate refresh token"})
	default:
		logger.Error("unexpected login error", "error", err)
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Internal server error"})
	}
}

// handleRegister handles POST /api/auth/register.
// @Summary  Register a new account
// @Tags     auth
// @Accept   json
// @Produce  json
// @Param    account body dtos.RegisterRequest true "New account details"
// @Success  201 {object} dtos.RegisterResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body or email already registered"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/auth/register [post]
func handleRegister(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqBody, problems, err := httpx.DecodeValid[dtos.RegisterRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		result, err := services.Register(r.Context(), q, reqBody)
		if err != nil {
			respondRegisterError(w, err)
			return
		}

		httpx.JSON(w, http.StatusCreated, result)
	}
}

// respondRegisterError maps Register's sentinel errors onto the exact
// response bodies the pre-refactor handler produced.
func respondRegisterError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, services.ErrEmailCheckFailed):
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{
			"error":    "Internal server error.",
			"scenario": "AS.8",
		})
	case errors.Is(err, services.ErrEmailTaken):
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Email already exists"})
	case errors.Is(err, services.ErrPasswordHashFailed):
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to process password"})
	case errors.Is(err, services.ErrInvalidInviteCode):
		// "field" is the wire contract the signup page routes on: it puts
		// this message under the invite-code input instead of in the page
		// alert. The three failure modes stay merged into one sentence so
		// the response cannot be used to probe which codes exist.
		httpx.JSON(w, http.StatusBadRequest, httpx.M{
			"error": "That invite code is not valid, has expired, or has already been used.",
			"field": "invite_code",
		})
	case errors.Is(err, services.ErrInvalidRole):
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid role"})
	case errors.Is(err, services.ErrUserCreateFailed):
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to create user"})
	default:
		logger.Error("unexpected register error", "error", err)
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Internal server error"})
	}
}

// handleGetCurrentUser handles GET /api/auth/me.
// Protected: Requires JWT authentication
// @Summary  Get the current user
// @Tags     auth
// @Security BearerAuth
// @Produce  json
// @Success  200 {object} dtos.UserResponse
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/auth/me [get]
func handleGetCurrentUser(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := authedUserID(w, r)
		if !ok {
			return
		}

		result, err := services.GetCurrentUser(r.Context(), q, uid)
		if err != nil {
			if errors.Is(err, services.ErrNotFound) {
				httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Unauthorized"})
				return
			}
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{
				"error":    "Internal server error",
				"scenario": "AS.6",
			})
			return
		}

		httpx.JSON(w, http.StatusOK, result)
	}
}

// refreshTokenRequest is the POST /api/auth/refresh body. It is a named
// type rather than an anonymous struct for two reasons: a Valid method
// cannot hang on an anonymous one, and swag needs a real schema to
// document instead of a bare "object".
type refreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (r refreshTokenRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if r.RefreshToken == "" {
		problems["refresh_token"] = "Refresh token is required"
	}

	return problems
}

// handleRefreshToken handles POST /api/auth/refresh.
// @Summary  Refresh an access token
// @Tags     auth
// @Accept   json
// @Produce  json
// @Param    body body refreshTokenRequest true "Refresh token"
// @Success  200 {object} map[string]interface{} "access_token"
// @Failure  400 {object} dtos.ErrorResponse "Refresh token is required"
// @Failure  401 {object} dtos.ErrorResponse "Invalid or expired refresh token"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/auth/refresh [post]
func handleRefreshToken() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// This handler does not use httpx.DecodeError: a malformed body
		// and a missing token produce the same message here.
		reqBody, _, err := httpx.DecodeValid[refreshTokenRequest](r)
		if err != nil {
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Refresh token is required"})
			return
		}

		newAccessToken, err := services.RefreshToken(reqBody.RefreshToken)
		if err != nil {
			switch {
			case errors.Is(err, services.ErrInvalidRefreshToken):
				httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Invalid refresh token"})
			case errors.Is(err, services.ErrWrongTokenType):
				httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "Invalid token type"})
			case errors.Is(err, services.ErrAccessTokenGeneration):
				httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to generate access token"})
			default:
				logger.Error("unexpected refresh token error", "error", err)
				httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Internal server error"})
			}
			return
		}

		httpx.JSON(w, http.StatusOK, httpx.M{
			"access_token": newAccessToken,
		})
	}
}

// forgotPasswordMinDuration is a floor under handleForgotPassword's
// response time. RequestPasswordReset's two paths differ measurably: the
// unknown-address path returns after one SELECT, while the known-address
// path mints a token and does two INSERTs plus a template render. That is
// a repeatable timing difference, and a repeatable timing difference is an
// account-enumeration side channel -- the exact thing this endpoint's
// identical response bodies already exist to prevent. Sleeping out to this
// floor on every request, success or failure, swamps that difference so
// response time no longer distinguishes known from unknown addresses:
// 400ms sits far above the slow path's normal latency, yet is invisible
// next to human-scale form submission.
//
// This narrows the channel; it does not perfectly close it. Under extreme
// load the slow path's own work could exceed 400ms on its own, and at that
// point the floor no longer hides it -- said honestly rather than claimed
// away.
const forgotPasswordMinDuration = 400 * time.Millisecond

// handleForgotPassword handles POST /api/auth/forgot-password.
// @Summary  Request a password reset
// @Tags     auth
// @Accept   json
// @Produce  json
// @Param    body body dtos.ForgotPasswordRequest true "Email address"
// @Success  200 {object} dtos.ForgotPasswordResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/auth/forgot-password [post]
func handleForgotPassword(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqBody, problems, err := httpx.DecodeValid[dtos.ForgotPasswordRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		// See forgotPasswordMinDuration: the floor applies identically to
		// the success and error branches below, since the timing side
		// channel it closes doesn't care which branch fired.
		start := time.Now()
		resetErr := services.RequestPasswordReset(r.Context(), q, reqBody)
		if elapsed := time.Since(start); elapsed < forgotPasswordMinDuration {
			time.Sleep(forgotPasswordMinDuration - elapsed)
		}

		if resetErr != nil {
			// The failure branch answers the same account-independent way
			// success does: an outage says nothing about whether the
			// address has an account either.
			logger.Error("unexpected forgot password error", "error", resetErr)
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Internal server error"})
			return
		}

		httpx.JSON(w, http.StatusOK, dtos.ForgotPasswordResponse{
			Message: "If an account exists for that address, a password reset link is on its way.",
		})
	}
}

// handleResetPassword handles POST /api/auth/reset-password.
// @Summary  Reset a password with a token
// @Tags     auth
// @Accept   json
// @Produce  json
// @Param    body body dtos.ResetPasswordRequest true "Token and new password"
// @Success  200 {object} dtos.ResetPasswordResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body or token"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/auth/reset-password [post]
func handleResetPassword(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqBody, problems, err := httpx.DecodeValid[dtos.ResetPasswordRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		if err := services.ResetPassword(r.Context(), q, reqBody); err != nil {
			respondResetPasswordError(w, err)
			return
		}

		httpx.JSON(w, http.StatusOK, dtos.ResetPasswordResponse{
			Message: "Password updated. You can now sign in.",
		})
	}
}

// respondResetPasswordError maps ResetPassword's sentinel errors onto
// their response bodies.
func respondResetPasswordError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, services.ErrResetTokenInvalid):
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "This password reset link is invalid or has expired."})
	default:
		logger.Error("unexpected reset password error", "error", err)
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Internal server error"})
	}
}

// handleVerifyEmail handles POST /api/auth/verify-email.
//
// This is a POST, not the GET a mailed link would normally carry: the
// mailed link (services.verifyEmailURL) points at the FRONTEND page, and
// that page is what POSTs the token here. A GET on this endpoint would be
// consumed by a corporate mail scanner or link-preview bot before the
// human ever clicks it, burning the single-use token before it reaches
// the person it was mailed to.
// @Summary  Verify an email address
// @Tags     auth
// @Accept   json
// @Produce  json
// @Param    body body dtos.VerifyEmailRequest true "Verification token"
// @Success  200 {object} dtos.VerifyEmailResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body or token"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/auth/verify-email [post]
func handleVerifyEmail(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		reqBody, problems, err := httpx.DecodeValid[dtos.VerifyEmailRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		if err := services.VerifyEmail(r.Context(), q, reqBody); err != nil {
			respondVerifyEmailError(w, err)
			return
		}

		httpx.JSON(w, http.StatusOK, dtos.VerifyEmailResponse{
			Message: "Your email address is verified.",
		})
	}
}

// respondVerifyEmailError maps VerifyEmail's sentinel errors onto their
// response bodies.
func respondVerifyEmailError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, services.ErrEmailTokenInvalid):
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "This verification link is invalid or has expired."})
	default:
		logger.Error("unexpected verify email error", "error", err)
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Internal server error"})
	}
}

// handleResendVerification handles POST /api/auth/resend-verification.
// Protected: requires JWT authentication. There is no request body -- the
// JWT identifies which account to mail, the same way GET /api/auth/me
// needs nothing but the token.
// @Summary  Resend the email verification link
// @Tags     auth
// @Security BearerAuth
// @Produce  json
// @Success  200 {object} dtos.VerifyEmailResponse
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/auth/resend-verification [post]
func handleResendVerification(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid, ok := authedUserID(w, r)
		if !ok {
			return
		}

		if err := services.ResendVerification(r.Context(), q, uid); err != nil {
			logger.Error("unexpected resend verification error", "error", err.Error())
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Internal server error"})
			return
		}

		// Same body whether or not the account was already verified:
		// ResendVerification's already-verified no-op must not read any
		// differently than a real send, or the response itself would leak
		// verification state to a caller who should just see "sent".
		httpx.JSON(w, http.StatusOK, dtos.VerifyEmailResponse{
			Message: "Verification email sent.",
		})
	}
}
