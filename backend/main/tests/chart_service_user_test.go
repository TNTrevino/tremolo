// Package tests provides comprehensive tests for chart service endpoints
package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGetUserChartData_Success tests that a user can fetch their own chart data
func TestGetUserChartData_Success(t *testing.T) {
	testutil.SetupTestDB(t)

	// Create a test user
	email := testutil.UniqueEmail(t, "chart_success")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Create a note game entry for the user
	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	// Set up mock context
	c, w := testutil.CreateGinContext("GET", "/api/charts/user/"+strconv.Itoa(userID))
	c.Set("userID", userID)
	c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

	// Call the handler
	services.GetUserChartData(c)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response dtos.MultiMetricChartData
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// The response should have arrays for all metrics
	assert.NotNil(t, response.NPM)
	assert.NotNil(t, response.Accuracy)
	assert.NotNil(t, response.SessionCount)
	assert.NotNil(t, response.TotalQuestions)
}

// TestGetUserChartData_Unauthorized tests that a user cannot access another user's data
func TestGetUserChartData_Unauthorized(t *testing.T) {
	testutil.SetupTestDB(t)

	// Create two users
	email1 := testutil.UniqueEmail(t, "chart_unauth1")
	userID1 := testutil.CreateTestUserWithDefaults(t, email1, "STUDENT")

	email2 := testutil.UniqueEmail(t, "chart_unauth2")
	userID2 := testutil.CreateTestUserWithDefaults(t, email2, "STUDENT")

	// Set up mock context where user1 tries to access user2's data
	c, w := testutil.CreateGinContext("GET", "/api/charts/user/"+strconv.Itoa(userID2))
	c.Set("userID", userID1)                                             // Authenticated as user1
	c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID2)}} // Requesting user2's data

	// Call the handler
	services.GetUserChartData(c)

	// Assertions
	assert.Equal(t, http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "Access denied", response["error"])
}

// TestGetUserChartData_InvalidUserID tests handling of invalid user ID parameter
// Note: This test only validates parameter parsing, which happens before DB access
func TestGetUserChartData_InvalidUserID(t *testing.T) {
	testCases := []struct {
		name         string
		userIDParam  string
		expectedCode int
		expectedErr  string
	}{
		{
			name:         "non-numeric user ID",
			userIDParam:  "abc",
			expectedCode: http.StatusBadRequest,
			expectedErr:  "Invalid user ID parameter",
		},
		{
			name:         "empty user ID",
			userIDParam:  "",
			expectedCode: http.StatusBadRequest,
			expectedErr:  "Invalid user ID parameter",
		},
		{
			name:         "float user ID",
			userIDParam:  "1.5",
			expectedCode: http.StatusBadRequest,
			expectedErr:  "Invalid user ID parameter",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			c, w := testutil.CreateGinContext("GET", "/api/charts/user/"+tc.userIDParam)
			c.Set("userID", 1)
			c.Params = gin.Params{{Key: "userId", Value: tc.userIDParam}}

			services.GetUserChartData(c)

			assert.Equal(t, tc.expectedCode, w.Code)

			var response map[string]string
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, tc.expectedErr, response["error"])
		})
	}
}

// TestGetUserChartData_MissingAuth tests when no userID is in context
func TestGetUserChartData_MissingAuth(t *testing.T) {
	c, w := testutil.CreateGinContext("GET", "/api/charts/user/1")
	c.Params = gin.Params{{Key: "userId", Value: "1"}}
	// Not setting userID in context

	services.GetUserChartData(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "Unauthorized", response["error"])
}

// TestGetUserChartData_InvalidAuthUserID tests when userID in context is not an int
func TestGetUserChartData_InvalidAuthUserID(t *testing.T) {
	c, w := testutil.CreateGinContext("GET", "/api/charts/user/1")
	c.Set("userID", "not-an-int") // Wrong type
	c.Params = gin.Params{{Key: "userId", Value: "1"}}

	services.GetUserChartData(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "Unauthorized", response["error"])
}

// TestGetUserChartData_AllIntervals tests that all interval values work correctly
func TestGetUserChartData_AllIntervals(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_intervals")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	intervals := []string{"day", "week", "month", "year", "all"}

	for _, interval := range intervals {
		t.Run("interval_"+interval, func(t *testing.T) {
			c, w := testutil.CreateGinContext("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?interval="+interval)
			c.Request = httptest.NewRequest("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?interval="+interval, nil)
			c.Set("userID", userID)
			c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

			services.GetUserChartData(c)

			assert.Equal(t, http.StatusOK, w.Code, "Failed for interval: %s", interval)

			var response dtos.MultiMetricChartData
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
		})
	}
}

// TestGetUserChartData_InvalidInterval tests that invalid intervals are rejected
func TestGetUserChartData_InvalidInterval(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_invalid_interval")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	c, w := testutil.CreateGinContext("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?interval=invalid")
	c.Request = httptest.NewRequest("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?interval=invalid", nil)
	c.Set("userID", userID)
	c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

	services.GetUserChartData(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Contains(t, response["error"], "invalid interval")
}

// TestGetUserChartData_InvalidDays tests handling of invalid days parameter
func TestGetUserChartData_InvalidDays(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_invalid_days")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	testCases := []struct {
		name string
		days string
	}{
		{name: "non-numeric days", days: "abc"},
		{name: "zero days", days: "0"},
		{name: "negative days", days: "-5"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			c, w := testutil.CreateGinContext("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?days="+tc.days)
			c.Request = httptest.NewRequest("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?days="+tc.days, nil)
			c.Set("userID", userID)
			c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

			services.GetUserChartData(c)

			assert.Equal(t, http.StatusBadRequest, w.Code)

			var response map[string]string
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, "Invalid days parameter", response["error"])
		})
	}
}

// TestGetUserChartData_NoEntries tests that empty arrays are returned for users with no entries
func TestGetUserChartData_NoEntries(t *testing.T) {
	testutil.SetupTestDB(t)

	// Create a user with no entries
	email := testutil.UniqueEmail(t, "chart_no_entries")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	c, w := testutil.CreateGinContext("GET", "/api/charts/user/"+strconv.Itoa(userID))
	c.Set("userID", userID)
	c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

	services.GetUserChartData(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response dtos.MultiMetricChartData
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// All arrays should be empty (or nil) but response should be valid
	assert.Empty(t, response.NPM)
	assert.Empty(t, response.Accuracy)
	assert.Empty(t, response.SessionCount)
	assert.Empty(t, response.TotalQuestions)
}

// TestGetUserChartData_WithEntries tests that data is returned for users with entries
func TestGetUserChartData_WithEntries(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_with_entries")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Create multiple entries with different values
	testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
		UserID:           userID,
		TimeLength:       "00:05:00",
		TotalQuestions:   20,
		CorrectQuestions: 18,
		NotesPerMinute:   3.5,
	})

	testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
		UserID:           userID,
		TimeLength:       "00:10:00",
		TotalQuestions:   40,
		CorrectQuestions: 35,
		NotesPerMinute:   4.0,
	})

	testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
		UserID:           userID,
		TimeLength:       "00:03:00",
		TotalQuestions:   15,
		CorrectQuestions: 12,
		NotesPerMinute:   5.0,
	})

	c, w := testutil.CreateGinContext("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?interval=all")
	c.Request = httptest.NewRequest("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?interval=all", nil)
	c.Set("userID", userID)
	c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

	services.GetUserChartData(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response dtos.MultiMetricChartData
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// Should have 3 entries in each array
	assert.Len(t, response.NPM, 3)
	assert.Len(t, response.Accuracy, 3)
	assert.Len(t, response.SessionCount, 3)
	assert.Len(t, response.TotalQuestions, 3)

	// Verify data values are reasonable (NPM values)
	npmValues := make([]float64, len(response.NPM))
	for i, point := range response.NPM {
		npmValues[i] = point.Value
	}
	// We expect NPM values 3.5, 4.0, and 5.0 (in some order based on timestamp)
	assert.Contains(t, npmValues, 3.5)
	assert.Contains(t, npmValues, 4.0)
	assert.Contains(t, npmValues, 5.0)

	// Verify total questions values
	totalQValues := make([]float64, len(response.TotalQuestions))
	for i, point := range response.TotalQuestions {
		totalQValues[i] = point.Value
	}
	assert.Contains(t, totalQValues, float64(20))
	assert.Contains(t, totalQValues, float64(40))
	assert.Contains(t, totalQValues, float64(15))
}

// TestGetUserChartData_DefaultQueryParams tests default query parameter values
func TestGetUserChartData_DefaultQueryParams(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_default_params")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	// Don't provide any query parameters - should use defaults (interval=day, days=30)
	c, w := testutil.CreateGinContext("GET", "/api/charts/user/"+strconv.Itoa(userID))
	c.Set("userID", userID)
	c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

	services.GetUserChartData(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response dtos.MultiMetricChartData
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// Response should be valid with default params
	assert.NotNil(t, response.NPM)
	assert.NotNil(t, response.Accuracy)
	assert.NotNil(t, response.SessionCount)
	assert.NotNil(t, response.TotalQuestions)
}

// TestGetUserChartData_CustomDays tests custom days parameter
func TestGetUserChartData_CustomDays(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_custom_days")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	testCases := []struct {
		name string
		days string
	}{
		{name: "7 days", days: "7"},
		{name: "14 days", days: "14"},
		{name: "30 days", days: "30"},
		{name: "90 days", days: "90"},
		{name: "365 days", days: "365"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			c, w := testutil.CreateGinContext("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?days="+tc.days)
			c.Request = httptest.NewRequest("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?days="+tc.days, nil)
			c.Set("userID", userID)
			c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

			services.GetUserChartData(c)

			assert.Equal(t, http.StatusOK, w.Code)

			var response dtos.MultiMetricChartData
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
		})
	}
}
