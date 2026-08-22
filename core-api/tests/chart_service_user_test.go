// Package tests provides comprehensive tests for chart service endpoints
package tests

import (
	"context"
	"testing"

	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Auth extraction, path-param parsing, and query-param binding are now
// controller concerns (controllers/chart_controller.go) and are no longer
// exercised here — these tests call the service directly with typed args.

// TestGetUserChartData_Success tests that a user can fetch their own chart data
func TestGetUserChartData_Success(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_success")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	response, err := services.GetUserChartData(context.Background(), database.Queries, userID, userID, "day", 30)
	require.NoError(t, err)

	assert.NotNil(t, response.NPM)
	assert.NotNil(t, response.Accuracy)
	assert.NotNil(t, response.SessionCount)
	assert.NotNil(t, response.TotalQuestions)
}

// TestGetUserChartData_Unauthorized tests that a user cannot access another user's data
func TestGetUserChartData_Unauthorized(t *testing.T) {
	testutil.SetupTestDB(t)

	email1 := testutil.UniqueEmail(t, "chart_unauth1")
	userID1 := testutil.CreateTestUserWithDefaults(t, email1, "STUDENT")

	email2 := testutil.UniqueEmail(t, "chart_unauth2")
	userID2 := testutil.CreateTestUserWithDefaults(t, email2, "STUDENT")

	// userID1 authenticated, requesting userID2's data.
	_, err := services.GetUserChartData(context.Background(), database.Queries, userID1, userID2, "day", 30)
	assert.ErrorIs(t, err, services.ErrForbidden)
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
			response, err := services.GetUserChartData(context.Background(), database.Queries, userID, userID, interval, 30)
			require.NoError(t, err, "failed for interval: %s", interval)
			assert.NotNil(t, response.NPM)
		})
	}
}

// TestGetUserChartData_InvalidInterval tests that invalid intervals are rejected
func TestGetUserChartData_InvalidInterval(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_invalid_interval")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	_, err := services.GetUserChartData(context.Background(), database.Queries, userID, userID, "invalid", 30)
	require.Error(t, err)
	assert.ErrorIs(t, err, services.ErrValidation)
	assert.Contains(t, err.Error(), "invalid interval")
}

// TestGetUserChartData_InvalidDays tests handling of invalid days parameter
func TestGetUserChartData_InvalidDays(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_invalid_days")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	testCases := []struct {
		name string
		days int
	}{
		{name: "zero days", days: 0},
		{name: "negative days", days: -5},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := services.GetUserChartData(context.Background(), database.Queries, userID, userID, "day", tc.days)
			assert.ErrorIs(t, err, services.ErrValidation)
		})
	}
}

// TestGetUserChartData_NoEntries tests that empty arrays are returned for users with no entries
func TestGetUserChartData_NoEntries(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_no_entries")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	response, err := services.GetUserChartData(context.Background(), database.Queries, userID, userID, "day", 30)
	require.NoError(t, err)

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

	response, err := services.GetUserChartData(context.Background(), database.Queries, userID, userID, "all", 30)
	require.NoError(t, err)

	assert.Len(t, response.NPM, 3)
	assert.Len(t, response.Accuracy, 3)
	assert.Len(t, response.SessionCount, 3)
	assert.Len(t, response.TotalQuestions, 3)

	npmValues := make([]float64, len(response.NPM))
	for i, point := range response.NPM {
		npmValues[i] = point.Value
	}
	// NPM is stored as int8, so 3.5 → 3, 4.0 → 4, 5.0 → 5
	assert.Contains(t, npmValues, float64(3))
	assert.Contains(t, npmValues, float64(4))
	assert.Contains(t, npmValues, float64(5))

	totalQValues := make([]float64, len(response.TotalQuestions))
	for i, point := range response.TotalQuestions {
		totalQValues[i] = point.Value
	}
	assert.Contains(t, totalQValues, float64(20))
	assert.Contains(t, totalQValues, float64(40))
	assert.Contains(t, totalQValues, float64(15))
}

// TestGetUserChartData_DefaultQueryParams tests the controller's default
// query parameter values (interval=day, days=30) applied at the service level
func TestGetUserChartData_DefaultQueryParams(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_default_params")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	response, err := services.GetUserChartData(context.Background(), database.Queries, userID, userID, "day", 30)
	require.NoError(t, err)

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

	daysCases := []int{7, 14, 30, 90, 365}

	for _, days := range daysCases {
		t.Run("", func(t *testing.T) {
			_, err := services.GetUserChartData(context.Background(), database.Queries, userID, userID, "day", days)
			require.NoError(t, err)
		})
	}
}
