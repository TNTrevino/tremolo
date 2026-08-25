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

// Auth extraction and query-param binding are now controller concerns
// (controllers/chart_controller.go) and are no longer exercised here —
// these tests call the service directly with typed args.

// TestGetTeacherClassChartData_Success tests that a teacher can fetch class data
func TestGetTeacherClassChartData_Success(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_chart_success")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	studentEmail := testutil.UniqueEmail(t, "student_chart_success")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, teacherID, "Chart Success Class")
	joinTestClass(t, studentID, class.JoinCode)
	testutil.CreateTestNoteGameEntryWithDefaults(t, studentID)

	require.NoError(t, services.RequireTeacherRole(context.Background(), database.Queries, teacherID))

	response, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherID, "day", 30)
	require.NoError(t, err)

	// emit_empty_slices makes every series non-nil, so NotNil asserted
	// nothing -- that is how #253 shipped.
	require.Len(t, response.NPM, 1)
	assert.Equal(t, float64(3), response.NPM[0].Value)
	assert.InDelta(t, 75.0, response.Accuracy[0].Value, 0.001)
	assert.Len(t, response.SessionCount, 1)
	assert.Equal(t, float64(20), response.TotalQuestions[0].Value)
}

// TestRequireTeacherRole_NotTeacher tests that non-teachers are rejected
func TestRequireTeacherRole_NotTeacher(t *testing.T) {
	testutil.SetupTestDB(t)

	testCases := []struct {
		name string
		role string
	}{
		{name: "student", role: "STUDENT"},
		{name: "parent", role: "PARENT"},
		{name: "admin", role: "ADMIN"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			email := testutil.UniqueEmail(t, "non_teacher_"+tc.name)
			userID := testutil.CreateTestUserWithDefaults(t, email, tc.role)

			err := services.RequireTeacherRole(context.Background(), database.Queries, userID)
			assert.ErrorIs(t, err, services.ErrForbidden)
		})
	}
}

// TestGetTeacherClassChartData_NoStudents tests that empty data is returned when teacher has no students
func TestGetTeacherClassChartData_NoStudents(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_no_students")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	response, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherID, "day", 30)
	require.NoError(t, err)

	assert.Empty(t, response.NPM)
	assert.Empty(t, response.Accuracy)
	assert.Empty(t, response.SessionCount)
	assert.Empty(t, response.TotalQuestions)
}

// TestGetTeacherClassChartData_WithStudents tests aggregated data for teacher with students
func TestGetTeacherClassChartData_WithStudents(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_with_students")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	student1Email := testutil.UniqueEmail(t, "student1_with_entries")
	student1ID := testutil.CreateTestUserWithDefaults(t, student1Email, "STUDENT")

	student2Email := testutil.UniqueEmail(t, "student2_with_entries")
	student2ID := testutil.CreateTestUserWithDefaults(t, student2Email, "STUDENT")

	class := createTestClass(t, teacherID, "Chart With Students Class")
	joinTestClass(t, student1ID, class.JoinCode)
	joinTestClass(t, student2ID, class.JoinCode)

	testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
		UserID:           student1ID,
		TimeLength:       "00:05:00",
		TotalQuestions:   20,
		CorrectQuestions: 18,
		NotesPerMinute:   3.5,
	})

	testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
		UserID:           student1ID,
		TimeLength:       "00:10:00",
		TotalQuestions:   40,
		CorrectQuestions: 35,
		NotesPerMinute:   4.0,
	})

	testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
		UserID:           student2ID,
		TimeLength:       "00:03:00",
		TotalQuestions:   15,
		CorrectQuestions: 12,
		NotesPerMinute:   5.0,
	})

	response, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherID, "all", 30)
	require.NoError(t, err)

	assert.Len(t, response.NPM, 3)
	assert.Len(t, response.Accuracy, 3)
	assert.Len(t, response.SessionCount, 3)
	assert.Len(t, response.TotalQuestions, 3)

	npmValues := make([]float64, len(response.NPM))
	for i, point := range response.NPM {
		npmValues[i] = point.Value
	}
	assert.Contains(t, npmValues, float64(3))
	assert.Contains(t, npmValues, float64(4))
	assert.Contains(t, npmValues, float64(5))
}

// TestGetTeacherClassChartData_AllIntervals tests that all interval values work for teachers
func TestGetTeacherClassChartData_AllIntervals(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_intervals")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	studentEmail := testutil.UniqueEmail(t, "student_intervals")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, teacherID, "Chart Intervals Class")
	joinTestClass(t, studentID, class.JoinCode)
	testutil.CreateTestNoteGameEntryWithDefaults(t, studentID)

	intervals := []string{"day", "week", "month", "year", "all"}

	for _, interval := range intervals {
		t.Run("interval_"+interval, func(t *testing.T) {
			response, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherID, interval, 30)
			require.NoError(t, err, "failed for interval: %s", interval)
			assert.Len(t, response.NPM, 1)
		})
	}
}

// TestGetTeacherClassChartData_InvalidInterval tests that invalid intervals are rejected for teachers
func TestGetTeacherClassChartData_InvalidInterval(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_invalid_interval")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	_, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherID, "invalid", 30)
	require.Error(t, err)
	assert.ErrorIs(t, err, services.ErrValidation)
	assert.Contains(t, err.Error(), "invalid interval")
}

// TestGetTeacherClassChartData_InvalidDays tests handling of invalid days parameter for teachers
func TestGetTeacherClassChartData_InvalidDays(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_invalid_days")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	testCases := []struct {
		name string
		days int
	}{
		{name: "zero days", days: 0},
		{name: "negative days", days: -5},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherID, "day", tc.days)
			assert.ErrorIs(t, err, services.ErrValidation)
		})
	}
}

// TestGetTeacherClassChartData_StudentsWithNoEntries tests teacher with students that have no entries
func TestGetTeacherClassChartData_StudentsWithNoEntries(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_students_no_entries")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	student1Email := testutil.UniqueEmail(t, "student_no_entry1")
	student1ID := testutil.CreateTestUserWithDefaults(t, student1Email, "STUDENT")

	student2Email := testutil.UniqueEmail(t, "student_no_entry2")
	student2ID := testutil.CreateTestUserWithDefaults(t, student2Email, "STUDENT")

	class := createTestClass(t, teacherID, "Chart No Entries Class")
	joinTestClass(t, student1ID, class.JoinCode)
	joinTestClass(t, student2ID, class.JoinCode)

	response, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherID, "day", 30)
	require.NoError(t, err)

	assert.Empty(t, response.NPM)
	assert.Empty(t, response.Accuracy)
	assert.Empty(t, response.SessionCount)
	assert.Empty(t, response.TotalQuestions)
}

// TestGetTeacherClassChartData_DefaultQueryParams tests the controller's
// default query parameter values (interval=day, days=30) applied at the
// service level
func TestGetTeacherClassChartData_DefaultQueryParams(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_default_params")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	response, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherID, "day", 30)
	require.NoError(t, err)

	assert.NotNil(t, response.NPM)
	assert.NotNil(t, response.Accuracy)
	assert.NotNil(t, response.SessionCount)
	assert.NotNil(t, response.TotalQuestions)
}

// TestGetTeacherClassChartData_DoesNotDoubleCountMultiClassStudent tests
// that a student enrolled in two of the teacher's classes still
// contributes each entry exactly once -- the roster join is a semi-join,
// not a plain join.
func TestGetTeacherClassChartData_DoesNotDoubleCountMultiClassStudent(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_multi_class")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	studentEmail := testutil.UniqueEmail(t, "student_multi_class")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	classA := createTestClass(t, teacherID, "Multi Class A")
	classB := createTestClass(t, teacherID, "Multi Class B")
	joinTestClass(t, studentID, classA.JoinCode)
	joinTestClass(t, studentID, classB.JoinCode)

	testutil.CreateTestNoteGameEntryWithDefaults(t, studentID)

	response, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherID, "day", 30)
	require.NoError(t, err)

	require.Len(t, response.NPM, 1, "a student in two of the teacher's classes must contribute their entry once")
	assert.Len(t, response.SessionCount, 1)
}

// TestGetTeacherClassChartData_ExcludesOtherTeachersRoster tests that one
// teacher's roster never leaks another teacher's chart data.
func TestGetTeacherClassChartData_ExcludesOtherTeachersRoster(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherAEmail := testutil.UniqueEmail(t, "teacher_a_roster")
	teacherAID := testutil.CreateTestUserWithDefaults(t, teacherAEmail, "TEACHER")
	studentAEmail := testutil.UniqueEmail(t, "student_a_roster")
	studentAID := testutil.CreateTestUserWithDefaults(t, studentAEmail, "STUDENT")
	classA := createTestClass(t, teacherAID, "Teacher A Class")
	joinTestClass(t, studentAID, classA.JoinCode)
	testutil.CreateTestNoteGameEntryWithDefaults(t, studentAID)

	teacherBEmail := testutil.UniqueEmail(t, "teacher_b_roster")
	teacherBID := testutil.CreateTestUserWithDefaults(t, teacherBEmail, "TEACHER")
	studentBEmail := testutil.UniqueEmail(t, "student_b_roster")
	studentBID := testutil.CreateTestUserWithDefaults(t, studentBEmail, "STUDENT")
	classB := createTestClass(t, teacherBID, "Teacher B Class")
	joinTestClass(t, studentBID, classB.JoinCode)

	responseA, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherAID, "day", 30)
	require.NoError(t, err)
	require.Len(t, responseA.NPM, 1)

	responseB, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherBID, "day", 30)
	require.NoError(t, err)
	assert.Empty(t, responseB.NPM)
}

// TestGetTeacherClassChartData_ExcludesArchivedClass tests that a class
// the teacher archived drops out of the roster.
func TestGetTeacherClassChartData_ExcludesArchivedClass(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_archived_class")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")
	studentEmail := testutil.UniqueEmail(t, "student_archived_class")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, teacherID, "Archived Class")
	joinTestClass(t, studentID, class.JoinCode)
	testutil.CreateTestNoteGameEntryWithDefaults(t, studentID)

	ctx := context.Background()
	require.NoError(t, services.ArchiveClass(ctx, database.Queries, teacherID, class.ID))

	response, err := services.GetTeacherClassChartData(ctx, database.Queries, teacherID, "day", 30)
	require.NoError(t, err)

	assert.Empty(t, response.NPM)
	assert.Empty(t, response.Accuracy)
	assert.Empty(t, response.SessionCount)
	assert.Empty(t, response.TotalQuestions)
}

// TestGetTeacherClassChartData_ExcludesRemovedStudent tests that a
// student the teacher removed from the class drops out of the roster,
// taking their historical entries with them.
func TestGetTeacherClassChartData_ExcludesRemovedStudent(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_removed_student")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")
	studentEmail := testutil.UniqueEmail(t, "student_removed")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, teacherID, "Removed Student Class")
	joinTestClass(t, studentID, class.JoinCode)
	testutil.CreateTestNoteGameEntryWithDefaults(t, studentID)

	ctx := context.Background()
	require.NoError(t, services.RemoveStudentFromClass(ctx, database.Queries, teacherID, class.ID, studentID))

	response, err := services.GetTeacherClassChartData(ctx, database.Queries, teacherID, "day", 30)
	require.NoError(t, err)

	assert.Empty(t, response.NPM)
	assert.Empty(t, response.Accuracy)
	assert.Empty(t, response.SessionCount)
	assert.Empty(t, response.TotalQuestions)
}
