package services

import (
	"database/sql"
	"net/http"
	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/logger"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// convertRowsToChartData converts database rows to chart data with computed metrics
// Transforms raw database entries into Chart.js compatible time-series data points
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
// Handles null values from database and returns zero time if date is invalid
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

// convertFetchChartDataInRangeRowsToAllRows converts FetchChartDataInRangeRow slice to FetchChartDataAllRow slice
// This allows us to use the same transformation logic for both range and all-time data
func convertFetchChartDataInRangeRowsToAllRows(inRangeRows []generated.FetchChartDataInRangeRow) []generated.FetchChartDataAllRow {
	rows := make([]generated.FetchChartDataAllRow, len(inRangeRows))
	for i, r := range inRangeRows {
		rows[i] = generated.FetchChartDataAllRow(r)
	}
	return rows
}

// convertFetchTeacherChartDataAllRowsToAllRows converts FetchTeacherChartDataAllRow slice to FetchChartDataAllRow slice
// This allows us to use the same transformation logic for both user and teacher data
func convertFetchTeacherChartDataAllRowsToAllRows(teacherRows []generated.FetchTeacherChartDataAllRow) []generated.FetchChartDataAllRow {
	rows := make([]generated.FetchChartDataAllRow, len(teacherRows))
	for i, r := range teacherRows {
		rows[i] = generated.FetchChartDataAllRow(r)
	}
	return rows
}

// convertFetchTeacherChartDataInRangeRowsToAllRows converts FetchTeacherChartDataInRangeRow slice to FetchChartDataAllRow slice
// This allows us to use the same transformation logic for both user and teacher range data
func convertFetchTeacherChartDataInRangeRowsToAllRows(teacherRows []generated.FetchTeacherChartDataInRangeRow) []generated.FetchChartDataAllRow {
	rows := make([]generated.FetchChartDataAllRow, len(teacherRows))
	for i, r := range teacherRows {
		rows[i] = generated.FetchChartDataAllRow(r)
	}
	return rows
}

// validateUserIDParam extracts and validates the user ID from URL parameters
// Returns the user ID and true if valid, sends error response and returns 0, false otherwise
func validateUserIDParam(c *gin.Context) (int, bool) {
	userIDStr := c.Param("userId")
	userID, err := strconv.Atoi(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID parameter"})
		return 0, false
	}
	return userID, true
}

// authorizeUserAccess verifies that the authenticated user can access the requested user's data
// Returns true if authorized, sends error response and returns false otherwise
func authorizeUserAccess(c *gin.Context, authenticatedUserID, requestedUserID int) bool {
	if authenticatedUserID != requestedUserID {
		logger.Info("User attempted to access another user's chart data",
			"authenticated_user", authenticatedUserID,
			"requested_user", requestedUserID)
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return false
	}
	return true
}

// validateChartQueryParams validates the interval and days query parameters
// Returns interval string, days int, and true if valid, sends error response and returns empty values and false otherwise
func validateChartQueryParams(c *gin.Context, userID int) (string, int, bool) {
	interval := c.DefaultQuery("interval", "day")
	daysStr := c.DefaultQuery("days", DefaultChartDataDays)

	if err := dtos.ValidateInterval(interval); err != nil {
		logger.Error("Invalid interval parameter", "error", err.Error(), "interval", interval, "user_id", userID)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return "", 0, false
	}

	days, err := strconv.Atoi(daysStr)
	if err != nil || days < MinChartDataDays {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid days parameter"})
		return "", 0, false
	}

	return interval, days, true
}

// verifyTeacherRole verifies that the user has a teacher role
// Returns true if the user is a teacher, sends error response and returns false otherwise
func verifyTeacherRole(c *gin.Context, teacherID int) bool {
	ctx := c.Request.Context()
	teacherID32 := int32(teacherID)

	userRole, err := database.Queries.GetUserRole(ctx, teacherID32)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return false
		}
		logger.Error("Failed to verify user role", "error", err.Error(), "user_id", teacherID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify user role"})
		return false
	}

	if !userRole.Valid || userRole.String != "teacher" {
		logger.Info("Non-teacher user attempted to access class metrics",
			"user_id", teacherID,
			"role", userRole.String)
		c.JSON(http.StatusForbidden, gin.H{"error": "Only teachers can access class metrics"})
		return false
	}

	return true
}

// fetchChartDataWithStrategy fetches chart data using the appropriate interval strategy
// Returns the response data or sends error response if fetching fails
func fetchChartDataWithStrategy(c *gin.Context, strategy IntervalStrategy, userID int32, days int, isTeacher bool) (dtos.MultiMetricChartData, bool) {
	ctx := c.Request.Context()

	var rows []generated.FetchChartDataAllRow
	var err error

	if isTeacher {
		rows, err = strategy.FetchTeacherData(ctx, userID, days)
		if err != nil {
			logger.Error("Failed to fetch teacher chart data", "error", err.Error(), "teacher_id", userID)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chart data"})
			return dtos.MultiMetricChartData{}, false
		}
	} else {
		rows, err = strategy.FetchUserData(ctx, userID, days)
		if err != nil {
			logger.Error("Failed to fetch chart data", "error", err.Error(), "user_id", userID)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch chart data"})
			return dtos.MultiMetricChartData{}, false
		}
	}

	response := convertRowsToChartData(rows)
	return response, true
}
