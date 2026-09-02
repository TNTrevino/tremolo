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
// Protected: Requires JWT authentication. A caller may read their own data,
// or an enrolled student's data if the caller owns an active class the
// student is in (see services.RequireUserStatsAccess).
// @Summary  Get general user info
// @Tags     user-info
// @Security BearerAuth
// @Produce  json
// @Param    userId path int true "User ID (self, or a student in a class you own)"
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

		// Fetch user information
		userInfo, err := services.GetGeneralUserInfo(r.Context(), q, authenticatedUserID, requestedUserID)
		if err != nil {
			if errors.Is(err, services.ErrForbidden) {
				httpx.JSON(w, http.StatusForbidden, httpx.M{"error": "Access denied"})
				return
			}
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
