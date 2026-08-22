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

	testutil.CreateTeacherStudentAssociation(t, teacherID, studentID)
	testutil.CreateTestNoteGameEntryWithDefaults(t, studentID)

	require.NoError(t, services.RequireTeacherRole(context.Background(), database.Queries, teacherID))

	response, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherID, "day", 30)
	require.NoError(t, err)

	assert.NotNil(t, response.NPM)
	assert.NotNil(t, response.Accuracy)
	assert.NotNil(t, response.SessionCount)
	assert.NotNil(t, response.TotalQuestions)
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

	testutil.CreateTeacherStudentAssociation(t, teacherID, student1ID)
	testutil.CreateTeacherStudentAssociation(t, teacherID, student2ID)

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

	testutil.CreateTeacherStudentAssociation(t, teacherID, studentID)
	testutil.CreateTestNoteGameEntryWithDefaults(t, studentID)

	intervals := []string{"day", "week", "month", "year", "all"}

	for _, interval := range intervals {
		t.Run("interval_"+interval, func(t *testing.T) {
			response, err := services.GetTeacherClassChartData(context.Background(), database.Queries, teacherID, interval, 30)
			require.NoError(t, err, "failed for interval: %s", interval)
			assert.NotNil(t, response.NPM)
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

	testutil.CreateTeacherStudentAssociation(t, teacherID, student1ID)
	testutil.CreateTeacherStudentAssociation(t, teacherID, student2ID)

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
