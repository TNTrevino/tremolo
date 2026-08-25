package tests

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestExportUserData_FullySeededStudent seeds one of every section
// (class membership, an assignment attempt, note-game settings, a JSONB
// game setting, keyboard bindings, a friend) and checks every section of
// the export comes back populated.
func TestExportUserData_FullySeededStudent(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "export_fs_teacher"), "TEACHER")
	studentID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "export_fs_student"), "STUDENT")
	friendID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "export_fs_friend"), "STUDENT")

	class := createTestClass(t, teacherID, "Export Test Band")
	joinTestClass(t, studentID, class.JoinCode)

	assignment, err := services.CreateAssignment(context.Background(), database.Queries, teacherID, class.ID, testAssignmentRequest())
	require.NoError(t, err)

	entry := &dtos.Entry{
		TimeLength:       "00:02:00",
		TotalQuestions:   10,
		CorrectQuestions: 8,
		UserID:           int16(studentID),
		NPM:              12,
		GameType:         "note",
		AssignmentID:     &assignment.ID,
	}
	entryID, err := services.CreateNoteGameEntry(context.Background(), database.Queries, studentID, entry)
	require.NoError(t, err)
	t.Cleanup(func() { testutil.DeleteTestNoteGameEntry(t, entryID) })

	_, err = services.UpsertNoteGameSettings(context.Background(), database.Queries, studentID, &dtos.NoteGameSettingsRequest{
		GameMode:  "time",
		TimeLimit: 30,
		NoteLimit: 25,
		Scale:     "C Major",
		Octave:    4,
		LowNote:   "C4",
		HighNote:  "C6",
		Clef:      "treble",
	})
	require.NoError(t, err)

	_, err = services.UpsertGameSettings(context.Background(), database.Queries, studentID, &dtos.GameSettingsRequest{
		GameType: "scale",
		Config:   json.RawMessage(`{"scale":"C"}`),
	})
	require.NoError(t, err)

	require.NoError(t, services.AddFriend(context.Background(), database.Queries, studentID, friendID))
	// There is no DeleteFriend query (the pre-existing gap
	// TestFriendsRoutes_AddFriend_Success_ReturnsCreated also hits: user
	// cleanup logs, but does not fail on, the FK violation this leaves
	// behind). Registered after CreateTestUser's own cleanups, so it
	// runs first (t.Cleanup is LIFO) and the user deletes cleanly.
	t.Cleanup(func() {
		_, _ = database.DBConn.ExecContext(context.Background(),
			"delete from tremolo.friends where user_id in ($1, $2) or friend_id in ($1, $2)",
			studentID, friendID)
	})

	result, err := services.ExportUserData(context.Background(), database.Queries, studentID)
	require.NoError(t, err)
	require.NotNil(t, result)

	exportedAt, err := time.Parse(time.RFC3339, result.ExportedAt)
	require.NoError(t, err, "exported_at must parse as RFC3339")
	assert.WithinDuration(t, time.Now().UTC(), exportedAt, time.Minute)

	assert.Equal(t, studentID, result.Profile.ID)
	assert.Equal(t, "Test", result.Profile.FirstName)
	assert.Equal(t, "STUDENT", result.Profile.Role)
	assert.False(t, result.Profile.HasGoogle)
	assert.NotEmpty(t, result.Profile.CreatedDate)

	require.NotNil(t, result.Settings.NoteGame)
	assert.Equal(t, "C Major", result.Settings.NoteGame.Scale)

	require.Len(t, result.Settings.Games, 1)
	assert.Equal(t, "scale", result.Settings.Games[0].GameType)

	require.NotNil(t, result.KeyboardBindings)

	require.Len(t, result.ScoreEntries, 1)
	assert.Equal(t, "note", result.ScoreEntries[0].GameType)
	require.NotNil(t, result.ScoreEntries[0].AssignmentID)
	assert.Equal(t, assignment.ID, *result.ScoreEntries[0].AssignmentID)

	require.Len(t, result.Classes.Joined, 1)
	assert.Equal(t, "Export Test Band", result.Classes.Joined[0].Name)
	assert.Empty(t, result.Classes.Owned)

	require.Len(t, result.AssignmentAttempts, 1)
	assert.Equal(t, "Export Test Band", result.AssignmentAttempts[0].ClassName)
	assert.Equal(t, assignment.Title, result.AssignmentAttempts[0].AssignmentTitle)

	require.Len(t, result.Friends, 1)
	assert.Equal(t, friendID, result.Friends[0].ID)
}

// TestExportUserData_BrandNewUser pins the empty-account shape: keyboard
// bindings are the one section that is never actually empty (Register,
// and CreateTestUser mirroring it, seed the default QWERTY layout for
// every new user), everything else is absent, and every slice section
// marshals as `[]`, never `null`.
func TestExportUserData_BrandNewUser(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	userID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "export_new"), "STUDENT")

	result, err := services.ExportUserData(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, result)

	assert.NotNil(t, result.KeyboardBindings)

	assert.Nil(t, result.Settings.NoteGame)
	assert.Empty(t, result.Settings.Games)
	assert.Empty(t, result.ScoreEntries)
	assert.Empty(t, result.Classes.Joined)
	assert.Empty(t, result.Classes.Owned)
	assert.Empty(t, result.AssignmentAttempts)
	assert.Empty(t, result.Friends)

	// assert.Empty above passes for both a nil slice and an empty one --
	// json.Marshal is what actually distinguishes them, and a parent
	// opening the downloaded file must see `[]`, never `null`.
	marshaled, err := json.Marshal(result)
	require.NoError(t, err)
	body := string(marshaled)
	assert.Contains(t, body, `"games":[]`)
	assert.Contains(t, body, `"score_entries":[]`)
	assert.Contains(t, body, `"joined":[]`)
	assert.Contains(t, body, `"owned":[]`)
	assert.Contains(t, body, `"assignment_attempts":[]`)
	assert.Contains(t, body, `"friends":[]`)
}

// TestExportUserData_UnknownID_ReturnsErrNotFound covers an id nothing
// has ever used.
func TestExportUserData_UnknownID_ReturnsErrNotFound(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	result, err := services.ExportUserData(context.Background(), database.Queries, 999_999_999)
	assert.Nil(t, result)
	assert.ErrorIs(t, err, services.ErrNotFound)
}

// TestExportUserData_Teacher_OwnedPopulatedJoinedEmpty covers the other
// class role: a teacher's own classes populate Owned, and Joined stays
// empty since the teacher is not enrolled anywhere as a student.
func TestExportUserData_Teacher_OwnedPopulatedJoinedEmpty(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "export_teacher"), "TEACHER")
	class := createTestClass(t, teacherID, "Export Teacher Class")

	result, err := services.ExportUserData(context.Background(), database.Queries, teacherID)
	require.NoError(t, err)
	require.NotNil(t, result)

	require.Len(t, result.Classes.Owned, 1)
	assert.Equal(t, class.ID, result.Classes.Owned[0].ID)
	assert.Equal(t, class.Name, result.Classes.Owned[0].Name)
	assert.Equal(t, class.JoinCode, result.Classes.Owned[0].JoinCode)
	assert.Empty(t, result.Classes.Joined)
}
