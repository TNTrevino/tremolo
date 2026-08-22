package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"sight-reading/database"
	"sight-reading/httpx"
	"sight-reading/middleware"
	"sight-reading/services"
	"sight-reading/validations"
)

// RegisterChartRoutes registers all chart-related routes.
// All routes are protected with JWT authentication middleware.
func RegisterChartRoutes(mux *http.ServeMux, q database.Querier) {
	// Personal user metrics
	// GET /api/charts/user/{userId}/metrics?interval=day&days=30
	mux.Handle("GET /api/charts/user/{userId}/metrics", middleware.RequireAuth(handleGetUserChartData(q)))

	// Teacher class metrics (aggregated across all students)
	// GET /api/charts/teacher/class-metrics?interval=day&days=30
	mux.Handle("GET /api/charts/teacher/class-metrics", middleware.RequireAuth(handleGetTeacherClassChartData(q)))
}

// respondChartError maps chart service sentinel errors to HTTP responses,
// mirroring respondClassError's errors.Is dispatch. Chart error text
// varies more per call site than the shared class vocabulary, so the
// forbidden/default wording is supplied by the caller.
func respondChartError(w http.ResponseWriter, err error, forbiddenMsg, defaultMsg string) {
	switch {
	case errors.Is(err, services.ErrNotFound):
		httpx.JSON(w, http.StatusUnauthorized, httpx.M{"error": "User not found"})
	case errors.Is(err, services.ErrForbidden):
		httpx.JSON(w, http.StatusForbidden, httpx.M{"error": forbiddenMsg})
	case errors.Is(err, services.ErrValidation):
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid request"})
	default:
		httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": defaultMsg})
	}
}

// chartUserIDParam parses the "{userId}" path parameter for chart routes.
// Kept separate from the shared pathID helper because chart routes have
// always reported this as "Invalid user ID parameter", not "Invalid id".
func chartUserIDParam(w http.ResponseWriter, r *http.Request) (int, bool) {
	userID, err := strconv.Atoi(r.PathValue("userId"))
	if err != nil {
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid user ID parameter"})
		return 0, false
	}
	return userID, true
}

// chartIntervalAndDays parses and validates the shared "interval"/"days"
// query parameters used by both chart endpoints.
func chartIntervalAndDays(w http.ResponseWriter, r *http.Request) (string, int, bool) {
	interval, err := validations.ChartInterval(r)
	if err != nil {
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": err.Error()})
		return "", 0, false
	}

	days, err := validations.ChartDays(r)
	if err != nil {
		httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Invalid days parameter"})
		return "", 0, false
	}

	return interval, days, true
}

// handleGetUserChartData fetches personal metrics for a specific user
// Query params: interval (day/week/month/year), days (default 30)
// Protected: Requires JWT authentication, users can only access their own data
// @Summary  Get personal chart metrics
// @Tags     charts
// @Security BearerAuth
// @Produce  json
// @Param    userId path int true "User ID (must match the authenticated user)"
// @Param    interval query string false "day, week, month, or year"
// @Param    days query int false "Lookback window in days (default 30)"
// @Success  200 {object} dtos.MultiMetricChartData
// @Failure  400 {object} dtos.ErrorResponse "Invalid user ID, interval, or days"
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  403 {object} dtos.ErrorResponse "Access denied"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/charts/user/{userId}/metrics [get]
func handleGetUserChartData(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authenticatedUserID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		requestedUserID, ok := chartUserIDParam(w, r)
		if !ok {
			return
		}

		// Ownership is checked before the query params are parsed, so a caller
		// probing someone else's chart URL gets the same 403 whatever they put
		// in interval/days. services.GetUserChartData re-checks this; the guard
		// here only fixes the order the two failures are reported in.
		if authenticatedUserID != requestedUserID {
			httpx.JSON(w, http.StatusForbidden, httpx.M{"error": "Access denied"})
			return
		}

		interval, days, ok := chartIntervalAndDays(w, r)
		if !ok {
			return
		}

		result, err := services.GetUserChartData(r.Context(), q, authenticatedUserID, requestedUserID, interval, days)
		if err != nil {
			respondChartError(w, err, "Access denied", "Failed to fetch chart data")
			return
		}
		httpx.JSON(w, http.StatusOK, result)
	}
}

// handleGetTeacherClassChartData fetches aggregated metrics for all students of a teacher
// Query params: interval (day/week/month/year), days (default 30)
// Protected: Requires JWT authentication AND role=teacher
// @Summary  Get aggregated class chart metrics
// @Tags     charts
// @Security BearerAuth
// @Produce  json
// @Param    interval query string false "day, week, month, or year"
// @Param    days query int false "Lookback window in days (default 30)"
// @Success  200 {object} dtos.MultiMetricChartData
// @Failure  400 {object} dtos.ErrorResponse "Invalid interval or days"
// @Failure  401 {object} dtos.ErrorResponse
// @Failure  403 {object} dtos.ErrorResponse "Only teachers can access class metrics"
// @Failure  500 {object} dtos.ErrorResponse
// @Router   /api/charts/teacher/class-metrics [get]
func handleGetTeacherClassChartData(q database.Querier) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		teacherID, ok := authedUserID(w, r)
		if !ok {
			return
		}

		if err := services.RequireTeacherRole(r.Context(), q, teacherID); err != nil {
			respondChartError(w, err, "Only teachers can access class metrics", "Failed to verify user role")
			return
		}

		interval, days, ok := chartIntervalAndDays(w, r)
		if !ok {
			return
		}

		result, err := services.GetTeacherClassChartData(r.Context(), q, teacherID, interval, days)
		if err != nil {
			respondChartError(w, err, "Only teachers can access class metrics", "Failed to fetch chart data")
			return
		}
		httpx.JSON(w, http.StatusOK, result)
	}
}
