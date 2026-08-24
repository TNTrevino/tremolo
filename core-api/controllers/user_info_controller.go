package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"sight-reading/database"
	"sight-reading/httpx"
	"sight-reading/middleware"
	"sight-reading/services"
)

// RegisterUserInfoRoutes registers the user information routes.
// All routes are protected with JWT authentication middleware.
func RegisterUserInfoRoutes(mux *http.ServeMux, q database.Querier) {
	mux.Handle("GET /api/users/{userId}/general-info",
		middleware.RequireAuth(handleGetGeneralUserInfo(q)))
}

// handleGetGeneralUserInfo fetches general user information including name, join date, and aggregate stats
// Protected: Requires JWT authentication, users can only access their own data
// @Summary  Get general user info
// @Tags     user-info
// @Security BearerAuth
// @Produce  json
// @Param    userId path int true "User ID (must match the authenticated user)"
// @Success  200 {object} dtos.GeneralUserInfoDTO
// @Failure  400 {object} dtos.ErrorResponse "Invalid user ID parameter"
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  403 {object} dtos.ErrorResponse "Access denied"
// @Failure  404 {object} dtos.ErrorResponse "User not found"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/users/{userId}/general-info [get]
func handleGetGeneralUserInfo(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authenticatedUserID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		// Extract requested user ID from URL parameter
		requestedUserID, err := strconv.Atoi(r.PathValue("userId"))
		if err != nil || requestedUserID <= 0 {
			httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid user ID parameter"})
			return
		}

		// Security: Verify user can only access their own data
		if authenticatedUserID != requestedUserID {
			httpx.JSON(w, http.StatusForbidden, httpx.M{"error": "Access denied"})
			return
		}
		// TODO: Future enhancement - allow teachers to view their students' info
		// Will require checking teacher_student table relationship

		// Fetch user information
		userInfo, err := services.GetGeneralUserInfo(r.Context(), q, requestedUserID)
		if err != nil {
			// Check if user not found
			if errors.Is(err, services.ErrNotFound) {
				httpx.JSON(w, http.StatusNotFound, httpx.M{"error": "User not found"})
				return
			}

			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Failed to retrieve user information"})
			return
		}

		httpx.JSON(w, http.StatusOK, userInfo)
	}
}
