// Package services provides chart data fetching for performance metrics visualization
package services

import (
	"database/sql"
	"net/http"
	"sight-reading/logger"
	"sight-reading/repositories"
	"strconv"

	dtos "sight-reading/DTOs"

	"github.com/gin-gonic/gin"
)

// GetUserChartData fetches personal metrics for a specific user
// Query params: interval (day/week/month/year), days (default 30)
// Protected: Requires JWT authentication, users can only access their own data
func GetUserChartData(c *gin.Context) {
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	authenticatedUserID, ok := userIDInterface.(int)
	if !ok {
		logger.Error("Failed to parse authenticated user ID from context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	requestedUserIDStr := c.Param("userId")
	requestedUserID, err := strconv.Atoi(requestedUserIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID parameter"})
		return
	}

	if authenticatedUserID != requestedUserID {
		logger.Info("User attempted to access another user's chart data",
			"authenticated_user", authenticatedUserID,
			"requested_user", requestedUserID)
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	interval := c.DefaultQuery("interval", "day")
	daysStr := c.DefaultQuery("days", "30")

	if err := dtos.ValidateInterval(interval); err != nil {
		logger.Error("Invalid interval parameter", "error", err.Error(), "interval", interval, "user_id", requestedUserID)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	days, err := strconv.Atoi(daysStr)
	if err != nil || days < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid days parameter"})
		return
	}

	noteGameRepo := repositories.NewNoteGameRepository()

	npm, err := noteGameRepo.FetchNPMData(requestedUserID, interval, days)
	if err != nil {
		logger.Error("Failed to fetch NPM data", "error", err.Error(), "user_id", requestedUserID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch NPM data"})
		return
	}

	accuracy, err := noteGameRepo.FetchAccuracyData(requestedUserID, interval, days)
	if err != nil {
		logger.Error("Failed to fetch accuracy data", "error", err.Error(), "user_id", requestedUserID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch accuracy data"})
		return
	}

	sessionCount, err := noteGameRepo.FetchSessionCountData(requestedUserID, interval, days)
	if err != nil {
		logger.Error("Failed to fetch session count data", "error", err.Error(), "user_id", requestedUserID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch session count data"})
		return
	}

	totalQuestions, err := noteGameRepo.FetchTotalQuestionsData(requestedUserID, interval, days)
	if err != nil {
		logger.Error("Failed to fetch total questions data", "error", err.Error(), "user_id", requestedUserID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch total questions data"})
		return
	}

	response := dtos.MultiMetricChartData{
		NPM:            npm,
		Accuracy:       accuracy,
		SessionCount:   sessionCount,
		TotalQuestions: totalQuestions,
	}

	c.JSON(http.StatusOK, response)
}

// GetTeacherClassChartData fetches aggregated metrics for all students of a teacher
// Query params: interval (day/week/month/year), days (default 30)
// Protected: Requires JWT authentication AND role=teacher
func GetTeacherClassChartData(c *gin.Context) {
	// Extract authenticated user ID from context
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	teacherID, ok := userIDInterface.(int)
	if !ok {
		logger.Error("Failed to parse teacher user ID from context")
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID"})
		return
	}

	userRepo := repositories.NewUserRepository()
	userRole, err := userRepo.GetUserRole(teacherID)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}
		logger.Error("Failed to verify user role", "error", err.Error(), "user_id", teacherID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify user role"})
		return
	}

	if userRole != "teacher" {
		logger.Info("Non-teacher user attempted to access class metrics",
			"user_id", teacherID,
			"role", userRole)
		c.JSON(http.StatusForbidden, gin.H{"error": "Only teachers can access class metrics"})
		return
	}

	interval := c.DefaultQuery("interval", "day")
	daysStr := c.DefaultQuery("days", "30")

	if err := dtos.ValidateInterval(interval); err != nil {
		logger.Error("Invalid interval parameter", "error", err.Error(), "interval", interval, "teacher_id", teacherID)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	days, err := strconv.Atoi(daysStr)
	if err != nil || days < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid days parameter"})
		return
	}

	noteGameRepo := repositories.NewNoteGameRepository()

	npm, err := noteGameRepo.FetchTeacherNPMData(teacherID, interval, days)
	if err != nil {
		logger.Error("Failed to fetch teacher NPM data", "error", err.Error(), "teacher_id", teacherID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch NPM data"})
		return
	}

	accuracy, err := noteGameRepo.FetchTeacherAccuracyData(teacherID, interval, days)
	if err != nil {
		logger.Error("Failed to fetch teacher accuracy data", "error", err.Error(), "teacher_id", teacherID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch accuracy data"})
		return
	}

	sessionCount, err := noteGameRepo.FetchTeacherSessionCountData(teacherID, interval, days)
	if err != nil {
		logger.Error("Failed to fetch teacher session count data", "error", err.Error(), "teacher_id", teacherID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch session count data"})
		return
	}

	totalQuestions, err := noteGameRepo.FetchTeacherTotalQuestionsData(teacherID, interval, days)
	if err != nil {
		logger.Error("Failed to fetch teacher total questions data", "error", err.Error(), "teacher_id", teacherID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch total questions data"})
		return
	}

	response := dtos.MultiMetricChartData{
		NPM:            npm,
		Accuracy:       accuracy,
		SessionCount:   sessionCount,
		TotalQuestions: totalQuestions,
	}

	c.JSON(http.StatusOK, response)
}
