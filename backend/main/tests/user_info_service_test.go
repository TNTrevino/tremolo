package tests

import (
	"context"
	"database/sql"
	"regexp"
	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGetGeneralUserInfo_Success verifies that GetGeneralUserInfo returns
// correct information for an existing user
func TestGetGeneralUserInfo_Success(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "userinfo_success")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "John",
		LastName:  "Doe",
		Role:      "STUDENT",
	})

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, "John", result.FirstName)
	assert.Equal(t, "Doe", result.LastName)
}

// TestGetGeneralUserInfo_UserNotFound verifies that GetGeneralUserInfo returns
// sql.ErrNoRows for a non-existent user
func TestGetGeneralUserInfo_UserNotFound(t *testing.T) {
	testutil.SetupTestDB(t)

	// Use a very large ID that won't exist
	nonExistentUserID := 999999999

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, nonExistentUserID)

	assert.ErrorIs(t, err, sql.ErrNoRows)
	assert.Nil(t, result)
}

// TestGetGeneralUserInfo_NoEntries verifies that a user with no note game entries
// has TotalEntries=0 and TotalDuration="00:00:00"
func TestGetGeneralUserInfo_NoEntries(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "userinfo_noentries")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, 0, result.TotalEntries)
	assert.Equal(t, "00:00:00", result.TotalDuration)
}

// TestGetGeneralUserInfo_WithEntries verifies that a user with note game entries
// has correct aggregate statistics
func TestGetGeneralUserInfo_WithEntries(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "userinfo_withentries")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Create a single entry with known duration
	testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
		UserID:           userID,
		TimeLength:       "00:10:30",
		TotalQuestions:   20,
		CorrectQuestions: 15,
		NotesPerMinute:   2.0,
	})

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, 1, result.TotalEntries)
	assert.Equal(t, "00:10:30", result.TotalDuration)
}

// TestGetGeneralUserInfo_DateFormat verifies that CreatedDate is formatted correctly
// as "Joined DD Mon YYYY" (e.g., "Joined 12 Mar 2024")
func TestGetGeneralUserInfo_DateFormat(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "userinfo_dateformat")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify the format matches "Joined DD Mon YYYY"
	// Pattern: "Joined " followed by 2-digit day, space, 3-letter month, space, 4-digit year
	datePattern := regexp.MustCompile(`^Joined \d{2} [A-Z][a-z]{2} \d{4}$`)
	assert.Regexp(t, datePattern, result.CreatedDate)
}

// TestGetGeneralUserInfo_MultipleEntries verifies that multiple entries are
// correctly summed for total duration and counted for total entries
func TestGetGeneralUserInfo_MultipleEntries(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "userinfo_multiple")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Create first entry: 00:05:00
	testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
		UserID:           userID,
		TimeLength:       "00:05:00",
		TotalQuestions:   10,
		CorrectQuestions: 8,
		NotesPerMinute:   2.0,
	})

	// Create second entry: 00:10:00
	testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
		UserID:           userID,
		TimeLength:       "00:10:00",
		TotalQuestions:   20,
		CorrectQuestions: 15,
		NotesPerMinute:   2.0,
	})

	// Create third entry: 00:15:00
	testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
		UserID:           userID,
		TimeLength:       "00:15:00",
		TotalQuestions:   30,
		CorrectQuestions: 25,
		NotesPerMinute:   2.0,
	})

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify total entries count
	assert.Equal(t, 3, result.TotalEntries)

	// Verify total duration: 00:05:00 + 00:10:00 + 00:15:00 = 00:30:00
	assert.Equal(t, "00:30:00", result.TotalDuration)
}
