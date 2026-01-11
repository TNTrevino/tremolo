// Package services provides chart data fetching for performance metrics visualization
package services

import (
	"database/sql"
	"net/http"
	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/logger"
	"strconv"
	"time"

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

	ctx := c.Request.Context()
	userID32 := int32(requestedUserID)

	var rows []generated.FetchChartDataAllRow

	if interval == "all" {
		rows, err = database.Queries.FetchChartDataAll(ctx, userID32)
	} else {
		inRangeRows, fetchErr := database.Queries.FetchChartDataInRange(ctx, generated.FetchChartDataInRangeParams{
			UserID:   userID32,
			DaysBack: days,
		})
		err = fetchErr
		// Convert to the same type for processing
		rows = make([]generated.FetchChartDataAllRow, len(inRangeRows))
		for i, r := range inRangeRows {
			rows[i] = generated.FetchChartDataAllRow{
				CreatedDate:      r.CreatedDate,
				CreatedTime:      r.CreatedTime,
				NotesPerMinute:   r.NotesPerMinute,
				CorrectQuestions: r.CorrectQuestions,
				TotalQuestions:   r.TotalQuestions,
			}
		}
	}

	if err != nil {
		logger.Error("Failed to fetch chart data", "error", err.Error(), "user_id", requestedUserID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chart data"})
		return
	}

	response := convertRowsToChartData(rows)
	c.JSON(http.StatusOK, response)
}

// GetTeacherClassChartData fetches aggregated metrics for all students of a teacher
// Query params: interval (day/week/month/year), days (default 30)
// Protected: Requires JWT authentication AND role=teacher
func GetTeacherClassChartData(c *gin.Context) {
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

	ctx := c.Request.Context()
	teacherID32 := int32(teacherID)

	userRole, err := database.Queries.GetUserRole(ctx, teacherID32)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}
		logger.Error("Failed to verify user role", "error", err.Error(), "user_id", teacherID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify user role"})
		return
	}

	if !userRole.Valid || userRole.String != "teacher" {
		logger.Info("Non-teacher user attempted to access class metrics",
			"user_id", teacherID,
			"role", userRole.String)
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

	var rows []generated.FetchChartDataAllRow

	if interval == "all" {
		teacherRows, fetchErr := database.Queries.FetchTeacherChartDataAll(ctx, teacherID32)
		err = fetchErr
		rows = make([]generated.FetchChartDataAllRow, len(teacherRows))
		for i, r := range teacherRows {
			rows[i] = generated.FetchChartDataAllRow{
				CreatedDate:      r.CreatedDate,
				CreatedTime:      r.CreatedTime,
				NotesPerMinute:   r.NotesPerMinute,
				CorrectQuestions: r.CorrectQuestions,
				TotalQuestions:   r.TotalQuestions,
			}
		}
	} else {
		teacherRows, fetchErr := database.Queries.FetchTeacherChartDataInRange(ctx, generated.FetchTeacherChartDataInRangeParams{
			TeacherID: teacherID32,
			DaysBack:  days,
		})
		err = fetchErr
		rows = make([]generated.FetchChartDataAllRow, len(teacherRows))
		for i, r := range teacherRows {
			rows[i] = generated.FetchChartDataAllRow{
				CreatedDate:      r.CreatedDate,
				CreatedTime:      r.CreatedTime,
				NotesPerMinute:   r.NotesPerMinute,
				CorrectQuestions: r.CorrectQuestions,
				TotalQuestions:   r.TotalQuestions,
			}
		}
	}

	if err != nil {
		logger.Error("Failed to fetch teacher chart data", "error", err.Error(), "teacher_id", teacherID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chart data"})
		return
	}

	response := convertRowsToChartData(rows)
	c.JSON(http.StatusOK, response)
}

// convertRowsToChartData converts database rows to chart data with computed metrics
func convertRowsToChartData(rows []generated.FetchChartDataAllRow) dtos.MultiMetricChartData {
	npm := make([]dtos.ChartDataPoint, 0, len(rows))
	accuracy := make([]dtos.ChartDataPoint, 0, len(rows))
	sessionCount := make([]dtos.ChartDataPoint, 0, len(rows))
	totalQuestions := make([]dtos.ChartDataPoint, 0, len(rows))

	for _, row := range rows {
		ts := combineDateTime(row.CreatedDate, row.CreatedTime)

		npm = append(npm, dtos.ChartDataPoint{
			Timestamp: ts,
			Value:     float64(row.NotesPerMinute),
		})

		var acc float64
		if row.TotalQuestions > 0 {
			acc = (float64(row.CorrectQuestions) / float64(row.TotalQuestions)) * 100
		}
		accuracy = append(accuracy, dtos.ChartDataPoint{
			Timestamp: ts,
			Value:     acc,
		})

		sessionCount = append(sessionCount, dtos.ChartDataPoint{
			Timestamp: ts,
			Value:     1,
		})

		totalQuestions = append(totalQuestions, dtos.ChartDataPoint{
			Timestamp: ts,
			Value:     float64(row.TotalQuestions),
		})
	}

	return dtos.MultiMetricChartData{
		NPM:            npm,
		Accuracy:       accuracy,
		SessionCount:   sessionCount,
		TotalQuestions: totalQuestions,
	}
}

// combineDateTime combines a date and time into a single timestamp
func combineDateTime(date, t sql.NullTime) time.Time {
	if !date.Valid {
		return time.Time{}
	}

	d := date.Time
	if t.Valid {
		return time.Date(d.Year(), d.Month(), d.Day(),
			t.Time.Hour(), t.Time.Minute(), t.Time.Second(), t.Time.Nanosecond(),
			d.Location())
	}
	return d
}
