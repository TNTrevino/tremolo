package tests

import (
	"context"
	"regexp"
	"testing"

	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

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

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, userID, userID)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, "John", result.FirstName)
	assert.Equal(t, "Doe", result.LastName)
}

// TestGetGeneralUserInfo_UserNotFound verifies that GetGeneralUserInfo maps
// sql.ErrNoRows to the shared services.ErrNotFound sentinel so controllers
// can map it to a 404 via errors.Is.
func TestGetGeneralUserInfo_UserNotFound(t *testing.T) {
	testutil.SetupTestDB(t)

	// Use a very large ID that won't exist
	nonExistentUserID := 999999999

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, nonExistentUserID, nonExistentUserID)

	assert.ErrorIs(t, err, services.ErrNotFound)
	assert.Nil(t, result)
}

// TestGetGeneralUserInfo_NoEntries verifies that a user with no note game entries
// has TotalEntries=0 and TotalDuration="00:00:00"
func TestGetGeneralUserInfo_NoEntries(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "userinfo_noentries")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, userID, userID)
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

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, userID, userID)
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

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, userID, userID)
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

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, userID, userID)
	require.NoError(t, err)
	require.NotNil(t, result)

	// Verify total entries count
	assert.Equal(t, 3, result.TotalEntries)

	// Verify total duration: 00:05:00 + 00:10:00 + 00:15:00 = 00:30:00
	assert.Equal(t, "00:30:00", result.TotalDuration)
}

// TestGetGeneralUserInfo_OwningTeacherAllowed verifies that a teacher who
// owns a class the target student is enrolled in may read that student's
// general info -- the #254 rule.
func TestGetGeneralUserInfo_OwningTeacherAllowed(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "userinfo_owning_teacher")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	studentEmail := testutil.UniqueEmail(t, "userinfo_owning_student")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, teacherID, "User Info Owning Class")
	joinTestClass(t, studentID, class.JoinCode)

	result, err := services.GetGeneralUserInfo(context.Background(), database.Queries, teacherID, studentID)
	require.NoError(t, err)
	require.NotNil(t, result)

	// CreateTestUserWithDefaults's fixed first name -- see testutil/db.go.
	assert.Equal(t, "Test", result.FirstName)
}

// TestGetGeneralUserInfo_NonOwningTeacherForbidden verifies that being A
// teacher is not enough -- a teacher who owns a class the target student is
// NOT enrolled in is forbidden, same as any other non-self caller.
func TestGetGeneralUserInfo_NonOwningTeacherForbidden(t *testing.T) {
	testutil.SetupTestDB(t)

	owningTeacherEmail := testutil.UniqueEmail(t, "userinfo_nonowning_owner")
	owningTeacherID := testutil.CreateTestUserWithDefaults(t, owningTeacherEmail, "TEACHER")

	studentEmail := testutil.UniqueEmail(t, "userinfo_nonowning_student")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, owningTeacherID, "User Info Non-Owning Target Class")
	joinTestClass(t, studentID, class.JoinCode)

	otherTeacherEmail := testutil.UniqueEmail(t, "userinfo_nonowning_other")
	otherTeacherID := testutil.CreateTestUserWithDefaults(t, otherTeacherEmail, "TEACHER")
	createTestClass(t, otherTeacherID, "User Info Non-Owning Other's Own Class")

	_, err := services.GetGeneralUserInfo(context.Background(), database.Queries, otherTeacherID, studentID)
	assert.ErrorIs(t, err, services.ErrForbidden)
}

// TestGetGeneralUserInfo_ArchivedClassForbidden verifies that an archived
// class stops granting the owning teacher access to its former students --
// mirroring the teacher chart queries' archived_at exclusion.
func TestGetGeneralUserInfo_ArchivedClassForbidden(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "userinfo_archived_teacher")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	studentEmail := testutil.UniqueEmail(t, "userinfo_archived_student")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, teacherID, "User Info Archived Class")
	joinTestClass(t, studentID, class.JoinCode)

	err := services.ArchiveClass(context.Background(), database.Queries, teacherID, class.ID)
	require.NoError(t, err)

	_, err = services.GetGeneralUserInfo(context.Background(), database.Queries, teacherID, studentID)
	assert.ErrorIs(t, err, services.ErrForbidden)
}
