package controllers

import (
	"errors"
	"net/http"
	"strconv"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/httpx"
	"sight-reading/logger"
	"sight-reading/middleware"
	"sight-reading/services"
)

// RegisterAccountRoutes registers the change-password and change-email
// routes. Both act on the authenticated caller's OWN account: userId in
// the path exists only so the URL matches the shape
// /api/users/{userId}/... already uses (general-info, note-game data),
// and every handler here checks it against the JWT before doing anything
// (see requireSelf).
//
// POST /api/auth/confirm-email-change is this feature's third route; it
// is registered by RegisterAuthRoutes instead (auth_controller.go),
// alongside verify-email and reset-password -- the other token-bearing
// links a mailed message carries, none of which are scoped to a userId
// path segment. Its handler, handleConfirmEmailChange, is defined below
// anyway, next to the rest of the account flow it belongs to.
func RegisterAccountRoutes(mux *http.ServeMux, q database.Querier) {
	mux.Handle("PUT /api/users/{userId}/password", middleware.RequireAuth(handleChangePassword(q)))
	mux.Handle("POST /api/users/{userId}/email", middleware.RequireAuth(handleRequestEmailChange(q)))
}

// requireSelf extracts the {userId} path value and checks it against the
// authenticated caller, answering the same 400/403 shapes
// user_info_controller.go's handleGetGeneralUserInfo does -- "Security:
// Verify user can only access their own data" applies here verbatim.
func requireSelf(w http.ResponseWriter, r *http.Request, authenticatedUserID int) (int, bool) {
	requestedUserID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil || requestedUserID <= 0 {
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid user ID parameter"})
		return 0, false
	}

	if authenticatedUserID != requestedUserID {
		httpx.JSON(w, http.StatusForbidden, httpx.M{"error": "Access denied"})
		return 0, false
	}

	return requestedUserID, true
}

// handleChangePassword handles PUT /api/users/{userId}/password.
// Protected: requires JWT authentication; the caller may only change
// their own password.
// @Summary  Change the caller's password
// @Tags     account
// @Security BearerAuth
// @Accept   json
// @Produce  json
// @Param    userId path int true "User ID (must match the authenticated user)"
// @Param    body body dtos.ChangePasswordRequest true "Current and new password"
// @Success  200 {object} dtos.ChangePasswordResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body, wrong current password, or no password set"
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  403 {object} dtos.ErrorResponse "Access denied"
// @Failure  404 {object} dtos.ErrorResponse
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/users/{userId}/password [put]
func handleChangePassword(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authenticatedUserID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		userID, ok := requireSelf(w, r, authenticatedUserID)
		if !ok {
			return
		}

		req, problems, err := httpx.DecodeValid[dtos.ChangePasswordRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		if err := services.ChangePassword(r.Context(), q, userID, req); err != nil {
			respondAccountError(w, err)
			return
		}

		httpx.JSON(w, http.StatusOK, dtos.ChangePasswordResponse{Message: "Password updated."})
	}
}

// handleRequestEmailChange handles POST /api/users/{userId}/email.
// Protected: requires JWT authentication; the caller may only change
// their own email address.
// @Summary  Request an email address change
// @Tags     account
// @Security BearerAuth
// @Accept   json
// @Produce  json
// @Param    userId path int true "User ID (must match the authenticated user)"
// @Param    body body dtos.ChangeEmailRequest true "Current password and the new address"
// @Success  200 {object} dtos.ChangeEmailResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body, wrong current password, no password set, or a Google-managed address"
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  403 {object} dtos.ErrorResponse "Access denied"
// @Failure  404 {object} dtos.ErrorResponse
// @Failure  409 {object} dtos.ErrorResponse "That email address is already in use"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/users/{userId}/email [post]
func handleRequestEmailChange(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authenticatedUserID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		userID, ok := requireSelf(w, r, authenticatedUserID)
		if !ok {
			return
		}

		req, problems, err := httpx.DecodeValid[dtos.ChangeEmailRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		if err := services.RequestEmailChange(r.Context(), q, userID, req); err != nil {
			respondAccountError(w, err)
			return
		}

		httpx.JSON(w, http.StatusOK, dtos.ChangeEmailResponse{
			Message: "Check your new address for a confirmation link.",
		})
	}
}

// handleConfirmEmailChange handles POST /api/auth/confirm-email-change.
// Unauthenticated: the token itself is the credential, same as
// verify-email and reset-password. Registered by RegisterAuthRoutes (see
// this file's RegisterAccountRoutes doc comment) -- kept here because it
// shares respondAccountError and the service call it wraps with the rest
// of this file.
//
// A POST, not the GET a mailed link would normally carry: same reason
// handleVerifyEmail is a POST. The mailed link points at the frontend
// page, which POSTs the token here itself, so a mail scanner or
// link-preview bot following the link directly never burns the
// single-use token before the person it was mailed to opens it.
// @Summary  Confirm an email address change
// @Tags     account
// @Accept   json
// @Produce  json
// @Param    body body dtos.ConfirmEmailChangeRequest true "Confirmation token"
// @Success  200 {object} dtos.ConfirmEmailChangeResponse
// @Failure  400 {object} dtos.ErrorResponse "Invalid request body or token"
// @Failure  409 {object} dtos.ErrorResponse "That email address is already in use"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/auth/confirm-email-change [post]
func handleConfirmEmailChange(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		req, problems, err := httpx.DecodeValid[dtos.ConfirmEmailChangeRequest](r)
		if err != nil {
			httpx.DecodeError(w, problems)
			return
		}

		result, err := services.ConfirmEmailChange(r.Context(), q, req)
		if err != nil {
			respondAccountError(w, err)
			return
		}

		httpx.JSON(w, http.StatusOK, result)
	}
}

// respondAccountError maps ChangePassword's, RequestEmailChange's and
// ConfirmEmailChange's sentinel errors onto their response bodies.
//
// Every failure here is a 400, not a 401 -- even ErrIncorrectPassword,
// which IS a failed password check. That is deliberate:
// frontend/src/app/core/interceptors/refresh.interceptor.ts retries any
// core-api 401 (other than the session endpoints) once, after refreshing
// the access token, on the theory that a 401 means an expired access
// token. A wrong current password on an otherwise-valid session is not
// that -- a 401 here would burn a refresh round trip for nothing and
// then silently resubmit the SAME wrong password a second time before
// the interceptor gives up and finally surfaces the error to the user.
// /api/auth/login keeps its own 401 because it IS a session endpoint
// (the interceptor's exclusion list already carves it out) and has no
// access token to refresh in the first place.
func respondAccountError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, services.ErrIncorrectPassword):
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Current password is incorrect"})
	case errors.Is(err, services.ErrNoPasswordSet):
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "This account signs in with Google and has no password to change."})
	case errors.Is(err, services.ErrEmailManagedByGoogle):
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "This account's email address is managed by Google."})
	case errors.Is(err, services.ErrValidation):
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid request"})
	case errors.Is(err, services.ErrEmailTaken):
		httpx.JSON(w, http.StatusConflict, httpx.M{"error": "That email address is already in use."})
	case errors.Is(err, services.ErrEmailTokenInvalid):
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "This email confirmation link is invalid or has expired."})
	case errors.Is(err, services.ErrNotFound):
		httpx.JSON(w, http.StatusNotFound, httpx.M{"error": "User not found"})
	default:
		logger.Error("unexpected account error", "error", err)
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Internal server error"})
	}
}
