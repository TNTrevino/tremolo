// Package services provides chart data fetching for performance metrics visualization
package services

import (
	"net/http"
	"sight-reading/logger"
	"sight-reading/middleware"

	"github.com/gin-gonic/gin"
)

const (
	// DefaultChartDataDays is the default number of days to fetch chart data for
	DefaultChartDataDays = "30"

	// MinChartDataDays is the minimum number of days that can be requested for chart data
	MinChartDataDays = 1
)

// GetUserChartData fetches personal metrics for a specific user
// Query params: interval (day/week/month/year), days (default 30)
// Protected: Requires JWT authentication, users can only access their own data
func GetUserChartData(c *gin.Context) {
	// Step 1: Authenticate and authorize
	authenticatedUserID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	requestedUserID, ok := validateUserIDParam(c)
	if !ok {
		return
	}

	if !authorizeUserAccess(c, authenticatedUserID, requestedUserID) {
		return
	}

	// Step 2: Validate query parameters
	interval, days, ok := validateChartQueryParams(c, requestedUserID)
	if !ok {
		return
	}

	// Step 3: Get interval strategy
	strategy, exists := GetIntervalStrategy(interval)
	if !exists {
		logger.Error("Unsupported interval strategy", "interval", interval, "user_id", requestedUserID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported interval type"})
		return
	}

	// Step 4: Fetch and transform data
	response, ok := fetchChartDataWithStrategy(c, strategy, int32(requestedUserID), days, false)
	if !ok {
		return
	}

	// Step 5: Return response
	c.JSON(http.StatusOK, response)
}

// GetTeacherClassChartData fetches aggregated metrics for all students of a teacher
// Query params: interval (day/week/month/year), days (default 30)
// Protected: Requires JWT authentication AND role=teacher
func GetTeacherClassChartData(c *gin.Context) {
	// Step 1: Authenticate and verify teacher role
	teacherID, err := middleware.GetAuthenticatedUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if !verifyTeacherRole(c, teacherID) {
		return
	}

	// Step 2: Validate query parameters
	interval, days, ok := validateChartQueryParams(c, teacherID)
	if !ok {
		return
	}

	// Step 3: Get interval strategy
	strategy, exists := GetIntervalStrategy(interval)
	if !exists {
		logger.Error("Unsupported interval strategy", "interval", interval, "teacher_id", teacherID)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported interval type"})
		return
	}

	// Step 4: Fetch and transform data
	response, ok := fetchChartDataWithStrategy(c, strategy, int32(teacherID), days, true)
	if !ok {
		return
	}

	// Step 5: Return response
	c.JSON(http.StatusOK, response)
}
