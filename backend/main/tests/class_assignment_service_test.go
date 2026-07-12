package tests

import (
	"context"
	"encoding/json"
	"strings"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// createTestClass creates a class owned by teacherID. Cleanup rides on
// the teacher user's deletion (classes cascade on teacher delete).
func createTestClass(t *testing.T, teacherID int, name string) *dtos.ClassResponse {
	t.Helper()
	class, err := services.CreateClass(
		context.Background(),
		database.Queries,
		teacherID,
		&dtos.CreateClassRequest{Name: name},
	)
	require.NoError(t, err)
	return class
}

func joinTestClass(t *testing.T, studentID int, joinCode string) {
	t.Helper()
	_, err := services.JoinClass(
		context.Background(),
		database.Queries,
		studentID,
		&dtos.JoinClassRequest{JoinCode: joinCode},
	)
	require.NoError(t, err)
}

func TestCreateClass_TeacherOnly(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "class_create_t"), "TEACHER")
	studentID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "class_create_s"), "STUDENT")

	class := createTestClass(t, teacherID, "Symphonic Band")
	assert.Equal(t, "Symphonic Band", class.Name)
	assert.Len(t, class.JoinCode, dtos.JoinCodeLength)
	assert.Equal(t, 0, class.StudentCount)

	_, err := services.CreateClass(
		context.Background(),
		database.Queries,
		studentID,
		&dtos.CreateClassRequest{Name: "Nope"},
	)
	assert.ErrorIs(t, err, services.ErrForbidden)
}

func TestJoinClass_ByCode(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "join_t"), "TEACHER")
	studentID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "join_s"), "STUDENT")
	class := createTestClass(t, teacherID, "Jazz Ensemble")

	// Codes are case-insensitive: students type them off a whiteboard.
	joined, err := services.JoinClass(
		context.Background(),
		database.Queries,
		studentID,
		&dtos.JoinClassRequest{JoinCode: " " + strings.ToLower(class.JoinCode) + " "},
	)
	require.NoError(t, err)
	assert.Equal(t, class.ID, joined.ID)

	// Joining twice is a no-op, not an error.
	joinTestClass(t, studentID, class.JoinCode)

	classes, err := services.ListStudentClasses(context.Background(), database.Queries, studentID)
	require.NoError(t, err)
	require.Len(t, classes, 1)
	assert.Equal(t, "Jazz Ensemble", classes[0].Name)

	// The owning teacher cannot sit on their own roster.
	_, err = services.JoinClass(
		context.Background(),
		database.Queries,
		teacherID,
		&dtos.JoinClassRequest{JoinCode: class.JoinCode},
	)
	assert.ErrorIs(t, err, services.ErrForbidden)

	// Unknown codes are a 404, not a 500.
	_, err = services.JoinClass(
		context.Background(),
		database.Queries,
		studentID,
		&dtos.JoinClassRequest{JoinCode: "ZZZZZZ"},
	)
	assert.ErrorIs(t, err, services.ErrNotFound)
}

func TestClassRoster_OwnershipEnforced(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "roster_t"), "TEACHER")
	otherTeacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "roster_t2"), "TEACHER")
	studentID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "roster_s"), "STUDENT")

	class := createTestClass(t, teacherID, "Concert Choir")
	joinTestClass(t, studentID, class.JoinCode)

	roster, err := services.GetClassRoster(context.Background(), database.Queries, teacherID, class.ID)
	require.NoError(t, err)
	require.Len(t, roster, 1)
	assert.Equal(t, studentID, roster[0].StudentID)

	// Another teacher cannot read a roster they don't own.
	_, err = services.GetClassRoster(context.Background(), database.Queries, otherTeacherID, class.ID)
	assert.ErrorIs(t, err, services.ErrForbidden)

	// A student can leave on their own; only the owner removes others.
	err = services.RemoveStudentFromClass(context.Background(), database.Queries, studentID, class.ID, studentID)
	require.NoError(t, err)
	roster, err = services.GetClassRoster(context.Background(), database.Queries, teacherID, class.ID)
	require.NoError(t, err)
	assert.Empty(t, roster)
}

func TestArchiveClass_HidesFromLists(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "archive_t"), "TEACHER")
	studentID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "archive_s"), "STUDENT")

	class := createTestClass(t, teacherID, "Old Semester")
	joinTestClass(t, studentID, class.JoinCode)

	require.NoError(t, services.ArchiveClass(context.Background(), database.Queries, teacherID, class.ID))

	teacherClasses, err := services.ListTeacherClasses(context.Background(), database.Queries, teacherID)
	require.NoError(t, err)
	for _, c := range teacherClasses {
		assert.NotEqual(t, class.ID, c.ID)
	}

	studentClasses, err := services.ListStudentClasses(context.Background(), database.Queries, studentID)
	require.NoError(t, err)
	assert.Empty(t, studentClasses)

	// Archived classes stop accepting joins.
	_, err = services.JoinClass(
		context.Background(),
		database.Queries,
		studentID,
		&dtos.JoinClassRequest{JoinCode: class.JoinCode},
	)
	assert.ErrorIs(t, err, services.ErrNotFound)
}

func testAssignmentRequest() *dtos.CreateAssignmentRequest {
	return &dtos.CreateAssignmentRequest{
		Title:    "Week 1: Treble Notes",
		GameType: "note",
		Config:   json.RawMessage(`{"scale": "C", "clef": "treble"}`),
	}
}

func TestCreateAssignment_ValidationAndOwnership(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "assign_t"), "TEACHER")
	otherTeacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "assign_t2"), "TEACHER")
	class := createTestClass(t, teacherID, "Beginner Band")

	created, err := services.CreateAssignment(context.Background(), database.Queries, teacherID, class.ID, testAssignmentRequest())
	require.NoError(t, err)
	assert.Equal(t, class.ID, created.ClassID)
	assert.Nil(t, created.DueAt)
	assert.Nil(t, created.TargetQuestions)

	// Not the owner.
	_, err = services.CreateAssignment(context.Background(), database.Queries, otherTeacherID, class.ID, testAssignmentRequest())
	assert.ErrorIs(t, err, services.ErrForbidden)

	// Bad game type fails validation before touching the DB.
	bad := testAssignmentRequest()
	bad.GameType = "kazoo"
	_, err = services.CreateAssignment(context.Background(), database.Queries, teacherID, class.ID, bad)
	assert.Error(t, err)

	list, err := services.ListClassAssignments(context.Background(), database.Queries, teacherID, class.ID)
	require.NoError(t, err)
	assert.Len(t, list, 1)
}

func TestAssignmentAttempts_FlowThroughEntries(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "attempt_t"), "TEACHER")
	studentID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "attempt_s"), "STUDENT")
	outsiderID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "attempt_o"), "STUDENT")

	class := createTestClass(t, teacherID, "Music Theory 1")
	joinTestClass(t, studentID, class.JoinCode)

	assignment, err := services.CreateAssignment(context.Background(), database.Queries, teacherID, class.ID, testAssignmentRequest())
	require.NoError(t, err)

	entry := &dtos.Entry{
		TimeLength:       "00:01:00",
		TotalQuestions:   20,
		CorrectQuestions: 15,
		UserID:           int16(studentID),
		NPM:              20,
		GameType:         "note",
		AssignmentID:     &assignment.ID,
	}
	entryID, err := services.CreateNoteGameEntry(context.Background(), database.Queries, studentID, entry)
	require.NoError(t, err)
	t.Cleanup(func() { testutil.DeleteTestNoteGameEntry(t, entryID) })

	// Wrong game type on the entry: the tag is rejected.
	badEntry := *entry
	badEntry.GameType = "scale"
	_, err = services.CreateNoteGameEntry(context.Background(), database.Queries, studentID, &badEntry)
	assert.ErrorIs(t, err, services.ErrValidation)

	// A student outside the class cannot attach attempts.
	outsiderEntry := *entry
	outsiderEntry.UserID = int16(outsiderID)
	_, err = services.CreateNoteGameEntry(context.Background(), database.Queries, outsiderID, &outsiderEntry)
	assert.ErrorIs(t, err, services.ErrForbidden)

	// Student view: one attempt, 75% best accuracy.
	studentAssignments, err := services.ListStudentAssignments(context.Background(), database.Queries, studentID)
	require.NoError(t, err)
	require.Len(t, studentAssignments, 1)
	assert.Equal(t, 1, studentAssignments[0].AttemptCount)
	assert.Equal(t, 15, studentAssignments[0].BestCorrect)
	assert.Equal(t, 75, studentAssignments[0].BestAccuracy)

	// Teacher grid: the enrolled student appears with their aggregate;
	// results are ownership-guarded.
	results, err := services.GetAssignmentResults(context.Background(), database.Queries, teacherID, assignment.ID)
	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, studentID, results[0].StudentID)
	assert.Equal(t, 1, results[0].AttemptCount)
	assert.Equal(t, 75, results[0].BestAccuracy)
	assert.NotEmpty(t, results[0].LastAttemptDate)

	_, err = services.GetAssignmentResults(context.Background(), database.Queries, studentID, assignment.ID)
	assert.ErrorIs(t, err, services.ErrForbidden)
}

func TestCreateClass_TrimsName(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "trim_t"), "TEACHER")

	class, err := services.CreateClass(
		context.Background(),
		database.Queries,
		teacherID,
		&dtos.CreateClassRequest{Name: "  Symphonic Band  "},
	)
	require.NoError(t, err)
	assert.Equal(t, "Symphonic Band", class.Name, "surrounding whitespace must be trimmed before persisting")
}

func TestCreateAssignment_TrimsTitle(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "trim_at"), "TEACHER")
	class := createTestClass(t, teacherID, "Band")

	req := testAssignmentRequest()
	req.Title = "  Week 1: Treble Notes  "
	created, err := services.CreateAssignment(context.Background(), database.Queries, teacherID, class.ID, req)
	require.NoError(t, err)
	assert.Equal(t, "Week 1: Treble Notes", created.Title, "title whitespace must be trimmed before persisting")
}

// A student's "best" fields must describe one real attempt, not a
// composite maxed column-by-column across different attempts.
func TestAssignmentResults_BestReflectsASingleAttempt(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "best_t"), "TEACHER")
	studentID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "best_s"), "STUDENT")
	class := createTestClass(t, teacherID, "Theory")
	joinTestClass(t, studentID, class.JoinCode)

	assignment, err := services.CreateAssignment(context.Background(), database.Queries, teacherID, class.ID, testAssignmentRequest())
	require.NoError(t, err)

	// Attempt A: 9/10 = 90% — the highest-accuracy attempt.
	// Attempt B: 15/20 = 75% — more correct and more questions, lower accuracy.
	// "Best" must be attempt A as a whole (9, 10, 90%), never a Frankenstein
	// row of best_correct=15 / most_questions=20 / best_accuracy=90.
	for _, a := range []struct{ correct, total int16 }{{9, 10}, {15, 20}} {
		entry := &dtos.Entry{
			TimeLength:       "00:01:00",
			TotalQuestions:   a.total,
			CorrectQuestions: a.correct,
			UserID:           int16(studentID),
			NPM:              10,
			GameType:         "note",
			AssignmentID:     &assignment.ID,
		}
		id, err := services.CreateNoteGameEntry(context.Background(), database.Queries, studentID, entry)
		require.NoError(t, err)
		t.Cleanup(func() { testutil.DeleteTestNoteGameEntry(t, id) })
	}

	// Student progress view.
	studentAssignments, err := services.ListStudentAssignments(context.Background(), database.Queries, studentID)
	require.NoError(t, err)
	require.Len(t, studentAssignments, 1)
	assert.Equal(t, 2, studentAssignments[0].AttemptCount)
	assert.Equal(t, 90, studentAssignments[0].BestAccuracy)
	assert.Equal(t, 9, studentAssignments[0].BestCorrect, "best_correct must come from the 90% attempt, not maxed independently")

	// Teacher results grid.
	results, err := services.GetAssignmentResults(context.Background(), database.Queries, teacherID, assignment.ID)
	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, 2, results[0].AttemptCount)
	assert.Equal(t, 90, results[0].BestAccuracy)
	assert.Equal(t, 9, results[0].BestCorrect, "best_correct must come from the 90% attempt")
	assert.Equal(t, 10, results[0].MostQuestions, "questions must come from the same attempt as best_correct/accuracy")
}

func TestAssignmentResults_StudentWithNoAttemptsAppears(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "grid_t"), "TEACHER")
	studentID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "grid_s"), "STUDENT")

	class := createTestClass(t, teacherID, "Orchestra")
	joinTestClass(t, studentID, class.JoinCode)

	assignment, err := services.CreateAssignment(context.Background(), database.Queries, teacherID, class.ID, testAssignmentRequest())
	require.NoError(t, err)

	results, err := services.GetAssignmentResults(context.Background(), database.Queries, teacherID, assignment.ID)
	require.NoError(t, err)
	require.Len(t, results, 1)
	assert.Equal(t, 0, results[0].AttemptCount)
	assert.Empty(t, results[0].LastAttemptDate)
}

func TestDeleteAssignment_KeepsEntries(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "del_t"), "TEACHER")
	studentID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "del_s"), "STUDENT")

	class := createTestClass(t, teacherID, "Percussion")
	joinTestClass(t, studentID, class.JoinCode)

	assignment, err := services.CreateAssignment(context.Background(), database.Queries, teacherID, class.ID, testAssignmentRequest())
	require.NoError(t, err)

	entry := &dtos.Entry{
		TimeLength:       "00:01:00",
		TotalQuestions:   10,
		CorrectQuestions: 9,
		UserID:           int16(studentID),
		NPM:              10,
		GameType:         "note",
		AssignmentID:     &assignment.ID,
	}
	entryID, err := services.CreateNoteGameEntry(context.Background(), database.Queries, studentID, entry)
	require.NoError(t, err)
	t.Cleanup(func() { testutil.DeleteTestNoteGameEntry(t, entryID) })

	require.NoError(t, services.DeleteAssignment(context.Background(), database.Queries, teacherID, assignment.ID))

	// The score entry survives with its tag nulled (FK on delete set null).
	entries, err := services.GetRecentNoteGameEntries(context.Background(), database.Queries, studentID, "note")
	require.NoError(t, err)
	assert.NotEmpty(t, entries)
}
