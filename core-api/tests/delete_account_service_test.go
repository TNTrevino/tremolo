package tests

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"testing"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestDeleteAccount_CascadesEverything seeds one row in every table that
// used to block DeleteUserByID with a foreign key violation --
// note_game_entries, a mutual friendship, and (for good measure,
// already-correct-before-this-ticket coverage) note_game_settings, a
// JSONB game_settings row, keyboard bindings, a class membership and a
// password reset token -- then deletes the account in one call.
//
// Without migration 00017's cascades, this fails at the DeleteAccount
// call itself: Postgres aborts the whole `delete from tremolo.users`
// the moment any cascading row hits a foreign key with no on-delete
// action, so require.NoError below is the load-bearing assertion. The
// per-table checks that follow it exist to catch a narrower class of
// bug that a bare error check would miss -- an FK fixed with the wrong
// action (e.g. SET NULL where CASCADE was intended), which would let
// the delete succeed while leaving orphaned rows behind.
func TestDeleteAccount_CascadesEverything(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)
	ctx := context.Background()

	password := "Old-Passw0rd!"
	email := testutil.UniqueEmail(t, "delete_account_cascade")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	friendEmail := testutil.UniqueEmail(t, "delete_account_cascade_friend")
	friendID := testutil.CreateTestUserWithDefaults(t, friendEmail, "STUDENT")
	teacherEmail := testutil.UniqueEmail(t, "delete_account_cascade_teacher")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	// note_game_entries.user_id
	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	// note_game_settings.user_id (already cascaded before this ticket --
	// seeded anyway so the one-statement delete actually exercises it)
	_, err := database.Queries.UpsertNoteGameSettings(ctx, generated.UpsertNoteGameSettingsParams{
		UserID:    int32(userID),
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

	// game_settings.user_id (JSONB settings; also already cascaded)
	_, err = database.Queries.UpsertGameSettings(ctx, generated.UpsertGameSettingsParams{
		UserID:   int32(userID),
		GameType: "key_signature",
		Config:   json.RawMessage(`{}`),
	})
	require.NoError(t, err)

	// class_students.student_id (already cascaded)
	class := createTestClass(t, teacherID, "Delete Cascade Class")
	joinTestClass(t, userID, class.JoinCode)

	// friends.user_id and friends.friend_id -- the pair 00017 exists for
	require.NoError(t, database.Queries.CreateMutualFriendship(ctx, generated.CreateMutualFriendshipParams{
		UserID:   int32(userID),
		FriendID: int32(friendID),
	}))

	// password_reset_tokens.user_id (already cascaded)
	testutil.CreatePasswordResetToken(t, userID, services.PasswordResetTokenTTL)

	// Keyboard bindings exist for every test user already
	// (testutil.CreateTestUser seeds the default row).

	err = services.DeleteAccount(ctx, database.Queries, userID, dtos.DeleteAccountRequest{
		Password:          password,
		EmailConfirmation: email,
	})
	require.NoError(t, err, "the one-statement delete must succeed once every FK it touches cascades")

	_, err = database.Queries.GetUserByID(ctx, int32(userID))
	assert.True(t, errors.Is(err, sql.ErrNoRows), "the user row itself must be gone")

	entries, err := database.Queries.GetEntriesByUserID(ctx, int32(userID))
	require.NoError(t, err)
	assert.Empty(t, entries, "note_game_entries must not survive the deleted owner")

	_, err = database.Queries.GetKeyboardBindings(ctx, int32(userID))
	assert.True(t, errors.Is(err, sql.ErrNoRows), "keyboard_bindings must not survive the deleted owner")

	friends, err := database.Queries.GetFriendsByUserID(ctx, int32(friendID))
	require.NoError(t, err)
	assert.Empty(t, friends, "the friendship must not survive the deleted party")
}

func TestDeleteAccount_WrongPassword(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)
	ctx := context.Background()

	email := testutil.UniqueEmail(t, "delete_account_wrong_password")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	err := services.DeleteAccount(ctx, database.Queries, userID, dtos.DeleteAccountRequest{
		Password:          "definitely-wrong",
		EmailConfirmation: email,
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrIncorrectPassword))

	_, err = database.Queries.GetUserByID(ctx, int32(userID))
	require.NoError(t, err, "a rejected delete must not touch the account")
}

func TestDeleteAccount_MismatchedEmailConfirmation(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)
	ctx := context.Background()

	password := "Old-Passw0rd!"
	email := testutil.UniqueEmail(t, "delete_account_mismatch_email")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})

	err := services.DeleteAccount(ctx, database.Queries, userID, dtos.DeleteAccountRequest{
		Password:          password,
		EmailConfirmation: "not-" + email,
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrValidation))

	_, err = database.Queries.GetUserByID(ctx, int32(userID))
	require.NoError(t, err, "a rejected delete must not touch the account")
}

// TestDeleteAccount_GoogleOnlyEmptyPassword_Succeeds uses
// testutil.CreateTestOAuthUser: no password hash, so the typed email
// confirmation is the whole re-authentication gate.
func TestDeleteAccount_GoogleOnlyEmptyPassword_Succeeds(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)
	ctx := context.Background()

	email := testutil.UniqueEmail(t, "delete_account_google_only")
	userID := testutil.CreateTestOAuthUser(t, email)

	err := services.DeleteAccount(ctx, database.Queries, userID, dtos.DeleteAccountRequest{
		Password:          "",
		EmailConfirmation: email,
	})
	require.NoError(t, err)

	_, err = database.Queries.GetUserByID(ctx, int32(userID))
	assert.True(t, errors.Is(err, sql.ErrNoRows))
}

func TestDeleteAccount_PasswordAccountEmptyPassword(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)
	ctx := context.Background()

	password := "Old-Passw0rd!"
	email := testutil.UniqueEmail(t, "delete_account_empty_password")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})

	err := services.DeleteAccount(ctx, database.Queries, userID, dtos.DeleteAccountRequest{
		Password:          "",
		EmailConfirmation: email,
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrPasswordRequired))

	_, err = database.Queries.GetUserByID(ctx, int32(userID))
	require.NoError(t, err, "a rejected delete must not touch the account")
}

func TestDeleteAccount_RemovesQueuedMail(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)
	ctx := context.Background()

	password := "Old-Passw0rd!"
	email := testutil.UniqueEmail(t, "delete_account_removes_queued_mail")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	testutil.EnqueueTestEmail(t, email)
	require.Len(t, testutil.QueuedEmailsFor(t, email), 1, "the queue fixture must have inserted one row")

	err := services.DeleteAccount(ctx, database.Queries, userID, dtos.DeleteAccountRequest{
		Password:          password,
		EmailConfirmation: email,
	})
	require.NoError(t, err)

	assert.Empty(t, testutil.QueuedEmailsFor(t, email), "a queued link addressed to a deleted account must not survive it")
}

// TestDeleteAccount_TeacherCascadePreservesStudentEntries pins the one
// behavior a district asks about: deleting a TEACHER cascades their
// classes and assignments (already-correct FKs from migration 00010),
// but a student's own score entry -- keyed by the STUDENT's user_id, not
// the teacher's -- survives, with assignment_id cleared to NULL instead
// of the entry itself disappearing.
func TestDeleteAccount_TeacherCascadePreservesStudentEntries(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)
	ctx := context.Background()

	teacherPassword := "Old-Passw0rd!"
	teacherEmail := testutil.UniqueEmail(t, "delete_account_teacher_cascade_teacher")
	teacherID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     teacherEmail,
		Password:  teacherPassword,
		FirstName: "Test",
		LastName:  "Teacher",
		Role:      "TEACHER",
	})
	studentEmail := testutil.UniqueEmail(t, "delete_account_teacher_cascade_student")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, teacherID, "Cascade Preserves Entries")
	joinTestClass(t, studentID, class.JoinCode)

	assignment, err := services.CreateAssignment(ctx, database.Queries, teacherID, class.ID, &dtos.CreateAssignmentRequest{
		Title:    "Quiz 1",
		GameType: "note",
		Config:   json.RawMessage(`{}`),
	})
	require.NoError(t, err)

	entryID, err := database.Queries.CreateNoteGameEntry(ctx, generated.CreateNoteGameEntryParams{
		UserID:           int32(studentID),
		TimeLength:       time.Date(0, 1, 1, 0, 5, 0, 0, time.UTC),
		TotalQuestions:   10,
		CorrectQuestions: 8,
		NotesPerMinute:   5,
		GameType:         "note",
		AssignmentID:     sql.NullInt32{Int32: int32(assignment.ID), Valid: true},
	})
	require.NoError(t, err)
	t.Cleanup(func() { testutil.DeleteTestNoteGameEntry(t, int64(entryID)) })

	err = services.DeleteAccount(ctx, database.Queries, teacherID, dtos.DeleteAccountRequest{
		Password:          teacherPassword,
		EmailConfirmation: teacherEmail,
	})
	require.NoError(t, err)

	_, err = database.Queries.GetClassByID(ctx, int32(class.ID))
	assert.True(t, errors.Is(err, sql.ErrNoRows), "the class must cascade away with its teacher")

	_, err = database.Queries.GetAssignmentByID(ctx, int32(assignment.ID))
	assert.True(t, errors.Is(err, sql.ErrNoRows), "the assignment must cascade away with its class")

	entries, err := database.Queries.GetEntriesByUserID(ctx, int32(studentID))
	require.NoError(t, err)
	require.Len(t, entries, 1, "the student's own entry must survive the teacher's deletion")
	assert.False(t, entries[0].AssignmentID.Valid, "assignment_id must be cleared to NULL, not left dangling")
}
