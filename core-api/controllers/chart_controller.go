package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"sight-reading/database"
	"sight-reading/middleware"
	"sight-reading/services"
	"sight-reading/validations"

	"github.com/gin-gonic/gin"
)

// SetupChartRoutes initializes all chart-related routes
// All routes are protected with JWT authentication middleware
func SetupChartRoutes(router *gin.Engine) {
	charts := router.Group("/api/charts")
	charts.Use(middleware.AuthMiddleware()) // Protect all chart routes
	{
		// Personal user metrics
		// GET /api/charts/user/:userId/metrics?interval=day&days=30
		charts.GET("/user/:userId/metrics", GetUserChartData)

		// Teacher class metrics (aggregated across all students)
		// GET /api/charts/teacher/class-metrics?interval=day&days=30
		charts.GET("/teacher/class-metrics", GetTeacherClassChartData)
	}
}

// respondChartError maps chart service sentinel errors to HTTP responses,
// mirroring respondClassError's errors.Is dispatch. Chart error text
// varies more per call site than the shared class vocabulary, so the
// forbidden/default wording is supplied by the caller.
func respondChartError(c *gin.Context, err error, forbiddenMsg, defaultMsg string) {
	switch {
	case errors.Is(err, services.ErrNotFound):
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
	case errors.Is(err, services.ErrForbidden):
		c.JSON(http.StatusForbidden, gin.H{"error": forbiddenMsg})
	case errors.Is(err, services.ErrValidation):
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": defaultMsg})
	}
}

// chartUserIDParam parses the ":userId" path parameter for chart routes.
// Kept separate from the shared pathID helper because chart routes have
// always reported this as "Invalid user ID parameter", not "Invalid id".
func chartUserIDParam(c *gin.Context) (int, bool) {
	userID, err := strconv.Atoi(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID parameter"})
		return 0, false
	}
	return userID, true
}

// chartIntervalAndDays parses and validates the shared "interval"/"days"
// query parameters used by both chart endpoints.
func chartIntervalAndDays(c *gin.Context) (string, int, bool) {
	interval, err := validations.ChartIntervalParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return "", 0, false
	}

	days, err := validations.ChartDaysParam(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid days parameter"})
		return "", 0, false
	}

	return interval, days, true
}

// GetUserChartData fetches personal metrics for a specific user
// Query params: interval (day/week/month/year), days (default 30)
// Protected: Requires JWT authentication, users can only access their own data
func GetUserChartData(c *gin.Context) {
	authenticatedUserID, ok := authedUserID(c)
	if !ok {
		return
	}

	requestedUserID, ok := chartUserIDParam(c)
	if !ok {
		return
	}

	// Ownership is checked before the query params are parsed, so a caller
	// probing someone else's chart URL gets the same 403 whatever they put
	// in interval/days. services.GetUserChartData re-checks this; the guard
	// here only fixes the order the two failures are reported in.
	if authenticatedUserID != requestedUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	interval, days, ok := chartIntervalAndDays(c)
	if !ok {
		return
	}

	result, err := services.GetUserChartData(c.Request.Context(), database.Queries, authenticatedUserID, requestedUserID, interval, days)
	if err != nil {
		respondChartError(c, err, "Access denied", "Failed to fetch chart data")
		return
	}
	c.JSON(http.StatusOK, result)
}

// GetTeacherClassChartData fetches aggregated metrics for all students of a teacher
// Query params: interval (day/week/month/year), days (default 30)
// Protected: Requires JWT authentication AND role=teacher
func GetTeacherClassChartData(c *gin.Context) {
	teacherID, ok := authedUserID(c)
	if !ok {
		return
	}

	if err := services.RequireTeacherRole(c.Request.Context(), database.Queries, teacherID); err != nil {
		respondChartError(c, err, "Only teachers can access class metrics", "Failed to verify user role")
		return
	}

	interval, days, ok := chartIntervalAndDays(c)
	if !ok {
		return
	}

	result, err := services.GetTeacherClassChartData(c.Request.Context(), database.Queries, teacherID, interval, days)
	if err != nil {
		respondChartError(c, err, "Only teachers can access class metrics", "Failed to fetch chart data")
		return
	}
	c.JSON(http.StatusOK, result)
}
