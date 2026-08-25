package tests

import (
	"context"
	"testing"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCreateNoteGameEntry_Success tests successful creation of a note game entry
func TestCreateNoteGameEntry_Success(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	// Create a test user
	email := testutil.UniqueEmail(t, "create_entry_success")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Create a valid entry
	entry := &dtos.Entry{
		UserID:           int64(userID),
		TimeLength:       "00:05:30",
		TotalQuestions:   20,
		CorrectQuestions: 15,
		NPM:              3,
	}

	// Call the service function
	entryID, err := services.CreateNoteGameEntry(context.Background(), database.Queries, userID, entry)
	require.NoError(t, err)
	require.Greater(t, entryID, int64(0), "Expected a positive entry ID")

	// Cleanup the created entry
	t.Cleanup(func() {
		testutil.DeleteTestNoteGameEntry(t, entryID)
	})
}

// TestCreateNoteGameEntry_Unauthorized tests that users cannot create entries for other users
func TestCreateNoteGameEntry_Unauthorized(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	// Create two test users
	email1 := testutil.UniqueEmail(t, "unauthorized_user1")
	userID1 := testutil.CreateTestUserWithDefaults(t, email1, "STUDENT")

	email2 := testutil.UniqueEmail(t, "unauthorized_user2")
	userID2 := testutil.CreateTestUserWithDefaults(t, email2, "STUDENT")

	// Try to create an entry for userID2 while authenticated as userID1
	entry := &dtos.Entry{
		UserID:           int64(userID2),
		TimeLength:       "00:05:30",
		TotalQuestions:   20,
		CorrectQuestions: 15,
		NPM:              3,
	}

	// Call the service function with mismatched user IDs
	_, err := services.CreateNoteGameEntry(context.Background(), database.Queries, userID1, entry)
	require.Error(t, err, "Expected an authorization error")
	assert.Equal(t, services.ErrUnauthorized, err)
}

// TestGetRecentNoteGameEntries_Success tests fetching entries for a user with entries
func TestGetRecentNoteGameEntries_Success(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "get_entries_success")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Create some test entries
	numEntries := 5
	for i := range numEntries {
		testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
			UserID:           userID,
			TimeLength:       "00:05:00",
			TotalQuestions:   20 + i,
			CorrectQuestions: 15 + i,
			NotesPerMinute:   3.0 + float64(i)*0.5,
		})
	}

	// Fetch entries
	entries, err := services.GetRecentNoteGameEntries(context.Background(), database.Queries, userID, "note")
	require.NoError(t, err)
	require.Len(t, entries, numEntries)

	// Verify all entries belong to the user
	for _, entry := range entries {
		assert.Equal(t, userID, entry.UserID, "Expected entry user ID to be %d", userID)
	}
}

// TestGetRecentNoteGameEntries_NoEntries tests fetching entries for a user with no entries
func TestGetRecentNoteGameEntries_NoEntries(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "get_entries_no_entries")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Fetch entries for user with no entries
	entries, err := services.GetRecentNoteGameEntries(context.Background(), database.Queries, userID, "note")
	require.NoError(t, err)
	require.NotNil(t, entries, "Expected empty slice, got nil")
	assert.Empty(t, entries)
}

// TestGetRecentNoteGameEntries_Limit30 tests that only a maximum of 30 entries are returned
func TestGetRecentNoteGameEntries_Limit30(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "get_entries_limit30")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Create 35 entries (more than the limit of 30)
	numEntries := 35
	for range numEntries {
		testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
			UserID:           userID,
			TimeLength:       "00:05:00",
			TotalQuestions:   20,
			CorrectQuestions: 15,
			NotesPerMinute:   3.0,
		})
	}

	// Fetch entries
	entries, err := services.GetRecentNoteGameEntries(context.Background(), database.Queries, userID, "note")
	require.NoError(t, err)

	// Should only return 30 entries
	assert.Len(t, entries, 30, "Expected 30 entries (limit)")
}

// TestGetRecentNoteGameEntries_OrderByDate tests that entries are ordered by created_date desc
func TestGetRecentNoteGameEntries_OrderByDate(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "get_entries_order")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Create entries with different data to identify them
	entriesData := []testutil.CreateTestNoteGameEntryParams{
		{UserID: userID, TimeLength: "00:01:00", TotalQuestions: 10, CorrectQuestions: 5, NotesPerMinute: 1.0},
		{UserID: userID, TimeLength: "00:02:00", TotalQuestions: 20, CorrectQuestions: 10, NotesPerMinute: 2.0},
		{UserID: userID, TimeLength: "00:03:00", TotalQuestions: 30, CorrectQuestions: 15, NotesPerMinute: 3.0},
	}

	// Create entries with a small delay to ensure ordering
	for _, params := range entriesData {
		testutil.CreateTestNoteGameEntry(t, params)
		time.Sleep(10 * time.Millisecond) // Small delay to ensure different timestamps
	}

	// Fetch entries
	entries, err := services.GetRecentNoteGameEntries(context.Background(), database.Queries, userID, "note")
	require.NoError(t, err)
	require.Len(t, entries, 3)

	// Verify entries are ordered by created_date desc (most recent first)
	// Since we created them in order with delays, the last created should be first
	for i := 0; i < len(entries)-1; i++ {
		assert.GreaterOrEqual(t, entries[i].CreatedDate, entries[i+1].CreatedDate,
			"Entries are not ordered by created_date desc: entry %d (%s) should be >= entry %d (%s)",
			i, entries[i].CreatedDate, i+1, entries[i+1].CreatedDate)
	}
}

// TestGetRecentNoteGameEntries_OnlyUserEntries tests that only entries for the specific user are returned
func TestGetRecentNoteGameEntries_OnlyUserEntries(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	// Create two users
	email1 := testutil.UniqueEmail(t, "user_entries_user1")
	userID1 := testutil.CreateTestUserWithDefaults(t, email1, "STUDENT")

	email2 := testutil.UniqueEmail(t, "user_entries_user2")
	userID2 := testutil.CreateTestUserWithDefaults(t, email2, "STUDENT")

	// Create entries for user 1
	for range 3 {
		testutil.CreateTestNoteGameEntryWithDefaults(t, userID1)
	}

	// Create entries for user 2
	for range 2 {
		testutil.CreateTestNoteGameEntryWithDefaults(t, userID2)
	}

	// Fetch entries for user 1
	entries1, err := services.GetRecentNoteGameEntries(context.Background(), database.Queries, userID1, "note")
	require.NoError(t, err)
	require.Len(t, entries1, 3)

	// Verify all entries belong to user 1
	for _, entry := range entries1 {
		assert.Equal(t, userID1, entry.UserID, "Expected entry to belong to user1 (%d)", userID1)
	}

	// Fetch entries for user 2
	entries2, err := services.GetRecentNoteGameEntries(context.Background(), database.Queries, userID2, "note")
	require.NoError(t, err)
	require.Len(t, entries2, 2)

	// Verify all entries belong to user 2
	for _, entry := range entries2 {
		assert.Equal(t, userID2, entry.UserID, "Expected entry to belong to user2 (%d)", userID2)
	}
}

// TestGetDailyActivityCounts tests the GetDailyActivityCounts service function
func TestGetDailyActivityCounts(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	t.Run("returns empty slice when user has no entries", func(t *testing.T) {
		t.Parallel()

		email := testutil.UniqueEmail(t, "activity_no_entries")
		userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

		counts, err := services.GetDailyActivityCounts(context.Background(), database.Queries, userID)
		require.NoError(t, err)
		require.NotNil(t, counts, "Expected empty slice, got nil")
		assert.Empty(t, counts)
	})

	t.Run("returns correct counts for user entries", func(t *testing.T) {
		t.Parallel()

		email := testutil.UniqueEmail(t, "activity_correct_counts")
		userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

		// Insert 2 entries on "today" and 1 entry on "today" as well (all same day since we can't control timestamps)
		// We create 3 entries total; all will fall on today's date
		for range 3 {
			testutil.CreateTestNoteGameEntryWithDefaults(t, userID)
		}

		counts, err := services.GetDailyActivityCounts(context.Background(), database.Queries, userID)
		require.NoError(t, err)
		require.NotEmpty(t, counts, "Expected at least one day with activity")

		// All entries are on the same day, so there should be exactly 1 date entry with count 3
		assert.Len(t, counts, 1, "Expected exactly 1 day with activity")
		assert.Equal(t, 3, counts[0].GameCount, "Expected game count of 3 for today")
	})

	t.Run("only returns entries for the authenticated user", func(t *testing.T) {
		t.Parallel()

		email1 := testutil.UniqueEmail(t, "activity_isolation_user1")
		userID1 := testutil.CreateTestUserWithDefaults(t, email1, "STUDENT")

		email2 := testutil.UniqueEmail(t, "activity_isolation_user2")
		userID2 := testutil.CreateTestUserWithDefaults(t, email2, "STUDENT")

		// Create 2 entries for user1
		for range 2 {
			testutil.CreateTestNoteGameEntryWithDefaults(t, userID1)
		}

		// Create 4 entries for user2
		for range 4 {
			testutil.CreateTestNoteGameEntryWithDefaults(t, userID2)
		}

		// Fetch counts for user1 and verify they don't include user2's counts
		counts1, err := services.GetDailyActivityCounts(context.Background(), database.Queries, userID1)
		require.NoError(t, err)
		require.NotEmpty(t, counts1)
		assert.Equal(t, 2, counts1[0].GameCount, "Expected user1 to have 2 games")

		// Fetch counts for user2 and verify they don't include user1's counts
		counts2, err := services.GetDailyActivityCounts(context.Background(), database.Queries, userID2)
		require.NoError(t, err)
		require.NotEmpty(t, counts2)
		assert.Equal(t, 4, counts2[0].GameCount, "Expected user2 to have 4 games")
	})
}

// TestCreateNoteGameEntry_VerifyStoredData tests that data is correctly stored and retrievable
func TestCreateNoteGameEntry_VerifyStoredData(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "verify_stored_data")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Create an entry with specific values
	entry := &dtos.Entry{
		UserID:           int64(userID),
		TimeLength:       "01:30:45",
		TotalQuestions:   50,
		CorrectQuestions: 42,
		NPM:              28,
	}

	entryID, err := services.CreateNoteGameEntry(context.Background(), database.Queries, userID, entry)
	require.NoError(t, err)

	t.Cleanup(func() {
		testutil.DeleteTestNoteGameEntry(t, entryID)
	})

	// Retrieve entries and verify data
	entries, err := services.GetRecentNoteGameEntries(context.Background(), database.Queries, userID, "note")
	require.NoError(t, err)
	require.NotEmpty(t, entries, "Expected at least one entry")

	// Find the created entry
	var found *dtos.NoteGameEntryResponse
	for i := range entries {
		if entries[i].ID == int(entryID) {
			found = &entries[i]
			break
		}
	}

	require.NotNil(t, found, "Could not find created entry with ID %d", entryID)

	// Verify stored data matches input
	assert.Equal(t, userID, found.UserID)
	assert.Equal(t, "01:30:45", found.TimeLength)
	assert.Equal(t, 50, found.TotalQuestions)
	assert.Equal(t, 42, found.CorrectQuestions)
	assert.Equal(t, 28.0, found.NotesPerMinute)
}

// TestCreateNoteGameEntry_RoundsFractionalNPM verifies a fractional NPM
// (e.g. from a client that doesn't pre-round) is stored rounded rather
// than truncated: the notes_per_minute column is an int, and 45.7 must
// read back as 46, not 45. Issue #252.
func TestCreateNoteGameEntry_RoundsFractionalNPM(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "rounds_fractional_npm")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	entry := &dtos.Entry{
		UserID:           int64(userID),
		TimeLength:       "00:05:30",
		TotalQuestions:   20,
		CorrectQuestions: 15,
		NPM:              45.7,
	}

	entryID, err := services.CreateNoteGameEntry(context.Background(), database.Queries, userID, entry)
	require.NoError(t, err)

	t.Cleanup(func() {
		testutil.DeleteTestNoteGameEntry(t, entryID)
	})

	entries, err := services.GetRecentNoteGameEntries(context.Background(), database.Queries, userID, "note")
	require.NoError(t, err)

	var found *dtos.NoteGameEntryResponse
	for i := range entries {
		if entries[i].ID == int(entryID) {
			found = &entries[i]
			break
		}
	}

	require.NotNil(t, found, "Could not find created entry with ID %d", entryID)
	assert.Equal(t, 46.0, found.NotesPerMinute, "45.7 should round up to 46, not truncate to 45")
}
