// Package tests provides comprehensive tests for chart service endpoints
package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestGetTeacherClassChartData_Success tests that a teacher can fetch class data
func TestGetTeacherClassChartData_Success(t *testing.T) {
	testutil.SetupTestDB(t)

	// Create a teacher
	teacherEmail := testutil.UniqueEmail(t, "teacher_chart_success")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	// Create a student
	studentEmail := testutil.UniqueEmail(t, "student_chart_success")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	// Associate teacher with student
	testutil.CreateTeacherStudentAssociation(t, teacherID, studentID)

	// Create an entry for the student
	testutil.CreateTestNoteGameEntryWithDefaults(t, studentID)

	c, w := testutil.CreateGinContext("GET", "/api/charts/class")
	c.Set("userID", teacherID)

	services.GetTeacherClassChartData(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response dtos.MultiMetricChartData
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// Should have data from the student's entry
	assert.NotNil(t, response.NPM)
	assert.NotNil(t, response.Accuracy)
	assert.NotNil(t, response.SessionCount)
	assert.NotNil(t, response.TotalQuestions)
}

// TestGetTeacherClassChartData_NotTeacher tests that non-teachers cannot access class data
func TestGetTeacherClassChartData_NotTeacher(t *testing.T) {
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

			c, w := testutil.CreateGinContext("GET", "/api/charts/class")
			c.Set("userID", userID)

			services.GetTeacherClassChartData(c)

			assert.Equal(t, http.StatusForbidden, w.Code)

			var response map[string]string
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, "Only teachers can access class metrics", response["error"])
		})
	}
}

// TestGetTeacherClassChartData_MissingAuth tests when no userID is in context
func TestGetTeacherClassChartData_MissingAuth(t *testing.T) {
	c, w := testutil.CreateGinContext("GET", "/api/charts/class")
	// Not setting userID in context

	services.GetTeacherClassChartData(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "Unauthorized", response["error"])
}

// TestGetTeacherClassChartData_InvalidAuthUserID tests when userID in context is not an int
func TestGetTeacherClassChartData_InvalidAuthUserID(t *testing.T) {
	c, w := testutil.CreateGinContext("GET", "/api/charts/class")
	c.Set("userID", "not-an-int") // Wrong type

	services.GetTeacherClassChartData(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "Unauthorized", response["error"])
}

// TestGetTeacherClassChartData_NoStudents tests that empty data is returned when teacher has no students
func TestGetTeacherClassChartData_NoStudents(t *testing.T) {
	testutil.SetupTestDB(t)

	// Create a teacher with no students
	teacherEmail := testutil.UniqueEmail(t, "teacher_no_students")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	c, w := testutil.CreateGinContext("GET", "/api/charts/class")
	c.Set("userID", teacherID)

	services.GetTeacherClassChartData(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response dtos.MultiMetricChartData
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// All arrays should be empty
	assert.Empty(t, response.NPM)
	assert.Empty(t, response.Accuracy)
	assert.Empty(t, response.SessionCount)
	assert.Empty(t, response.TotalQuestions)
}

// TestGetTeacherClassChartData_WithStudents tests aggregated data for teacher with students
func TestGetTeacherClassChartData_WithStudents(t *testing.T) {
	testutil.SetupTestDB(t)

	// Create a teacher
	teacherEmail := testutil.UniqueEmail(t, "teacher_with_students")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	// Create multiple students
	student1Email := testutil.UniqueEmail(t, "student1_with_entries")
	student1ID := testutil.CreateTestUserWithDefaults(t, student1Email, "STUDENT")

	student2Email := testutil.UniqueEmail(t, "student2_with_entries")
	student2ID := testutil.CreateTestUserWithDefaults(t, student2Email, "STUDENT")

	// Associate teacher with students
	testutil.CreateTeacherStudentAssociation(t, teacherID, student1ID)
	testutil.CreateTeacherStudentAssociation(t, teacherID, student2ID)

	// Create entries for student 1
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

	// Create entries for student 2
	testutil.CreateTestNoteGameEntry(t, testutil.CreateTestNoteGameEntryParams{
		UserID:           student2ID,
		TimeLength:       "00:03:00",
		TotalQuestions:   15,
		CorrectQuestions: 12,
		NotesPerMinute:   5.0,
	})

	c, w := testutil.CreateGinContext("GET", "/api/charts/class?interval=all")
	c.Request = httptest.NewRequest("GET", "/api/charts/class?interval=all", nil)
	c.Set("userID", teacherID)

	services.GetTeacherClassChartData(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response dtos.MultiMetricChartData
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// Should have 3 total entries (2 from student1, 1 from student2)
	assert.Len(t, response.NPM, 3)
	assert.Len(t, response.Accuracy, 3)
	assert.Len(t, response.SessionCount, 3)
	assert.Len(t, response.TotalQuestions, 3)

	// Verify NPM values from all students are included
	npmValues := make([]float64, len(response.NPM))
	for i, point := range response.NPM {
		npmValues[i] = point.Value
	}
	assert.Contains(t, npmValues, 3.5)
	assert.Contains(t, npmValues, 4.0)
	assert.Contains(t, npmValues, 5.0)
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
			c, w := testutil.CreateGinContext("GET", "/api/charts/class?interval="+interval)
			c.Request = httptest.NewRequest("GET", "/api/charts/class?interval="+interval, nil)
			c.Set("userID", teacherID)

			services.GetTeacherClassChartData(c)

			assert.Equal(t, http.StatusOK, w.Code, "Failed for interval: %s", interval)

			var response dtos.MultiMetricChartData
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
		})
	}
}

// TestGetTeacherClassChartData_InvalidInterval tests that invalid intervals are rejected for teachers
func TestGetTeacherClassChartData_InvalidInterval(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_invalid_interval")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	c, w := testutil.CreateGinContext("GET", "/api/charts/class?interval=invalid")
	c.Request = httptest.NewRequest("GET", "/api/charts/class?interval=invalid", nil)
	c.Set("userID", teacherID)

	services.GetTeacherClassChartData(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Contains(t, response["error"], "invalid interval")
}

// TestGetTeacherClassChartData_InvalidDays tests handling of invalid days parameter for teachers
func TestGetTeacherClassChartData_InvalidDays(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_invalid_days")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

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
			c, w := testutil.CreateGinContext("GET", "/api/charts/class?days="+tc.days)
			c.Request = httptest.NewRequest("GET", "/api/charts/class?days="+tc.days, nil)
			c.Set("userID", teacherID)

			services.GetTeacherClassChartData(c)

			assert.Equal(t, http.StatusBadRequest, w.Code)

			var response map[string]string
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, "Invalid days parameter", response["error"])
		})
	}
}

// TestGetTeacherClassChartData_StudentsWithNoEntries tests teacher with students that have no entries
func TestGetTeacherClassChartData_StudentsWithNoEntries(t *testing.T) {
	testutil.SetupTestDB(t)

	// Create a teacher
	teacherEmail := testutil.UniqueEmail(t, "teacher_students_no_entries")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	// Create students with no entries
	student1Email := testutil.UniqueEmail(t, "student_no_entry1")
	student1ID := testutil.CreateTestUserWithDefaults(t, student1Email, "STUDENT")

	student2Email := testutil.UniqueEmail(t, "student_no_entry2")
	student2ID := testutil.CreateTestUserWithDefaults(t, student2Email, "STUDENT")

	// Associate teacher with students
	testutil.CreateTeacherStudentAssociation(t, teacherID, student1ID)
	testutil.CreateTeacherStudentAssociation(t, teacherID, student2ID)

	c, w := testutil.CreateGinContext("GET", "/api/charts/class")
	c.Set("userID", teacherID)

	services.GetTeacherClassChartData(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response dtos.MultiMetricChartData
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// All arrays should be empty since students have no entries
	assert.Empty(t, response.NPM)
	assert.Empty(t, response.Accuracy)
	assert.Empty(t, response.SessionCount)
	assert.Empty(t, response.TotalQuestions)
}

// TestGetTeacherClassChartData_DefaultQueryParams tests default query parameter values for teacher
func TestGetTeacherClassChartData_DefaultQueryParams(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_default_params")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")

	// Don't provide any query parameters - should use defaults (interval=day, days=30)
	c, w := testutil.CreateGinContext("GET", "/api/charts/class")
	c.Set("userID", teacherID)

	services.GetTeacherClassChartData(c)

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
