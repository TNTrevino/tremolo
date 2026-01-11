// Package tests provides comprehensive tests for chart service endpoints
package tests

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/logger"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

var initLoggerOnce sync.Once

// initTestLogger initializes the logger for tests (idempotent)
func initTestLogger() {
	initLoggerOnce.Do(func() {
		logger.InitLogger()
	})
}

// createMockContext creates a mock gin context with httptest recorder
func createMockContext(method, path string) (*gin.Context, *httptest.ResponseRecorder) {
	initTestLogger()
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(method, path, nil)
	return c, w
}

// TestGetUserChartData_Success tests that a user can fetch their own chart data
func TestGetUserChartData_Success(t *testing.T) {
	testutil.SetupTestDB(t)

	// Create a test user
	email := testutil.UniqueEmail(t, "chart_success")
	userID := testutil.CreateTestUserWithDefaults(t, email, "student")

	// Create a note game entry for the user
	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	// Set up mock context
	c, w := createMockContext("GET", "/api/charts/user/"+strconv.Itoa(userID))
	c.Set("userID", userID)
	c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

	// Call the handler
	services.GetUserChartData(c)

	// Assertions
	assert.Equal(t, http.StatusOK, w.Code)

	var response dtos.MultiMetricChartData
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// The response should have arrays for all metrics
	assert.NotNil(t, response.NPM)
	assert.NotNil(t, response.Accuracy)
	assert.NotNil(t, response.SessionCount)
	assert.NotNil(t, response.TotalQuestions)
}

// TestGetUserChartData_Unauthorized tests that a user cannot access another user's data
func TestGetUserChartData_Unauthorized(t *testing.T) {
	testutil.SetupTestDB(t)

	// Create two users
	email1 := testutil.UniqueEmail(t, "chart_unauth1")
	userID1 := testutil.CreateTestUserWithDefaults(t, email1, "student")

	email2 := testutil.UniqueEmail(t, "chart_unauth2")
	userID2 := testutil.CreateTestUserWithDefaults(t, email2, "student")

	// Set up mock context where user1 tries to access user2's data
	c, w := createMockContext("GET", "/api/charts/user/"+strconv.Itoa(userID2))
	c.Set("userID", userID1)                                             // Authenticated as user1
	c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID2)}} // Requesting user2's data

	// Call the handler
	services.GetUserChartData(c)

	// Assertions
	assert.Equal(t, http.StatusForbidden, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "Access denied", response["error"])
}

// TestGetUserChartData_InvalidUserID tests handling of invalid user ID parameter
// Note: This test only validates parameter parsing, which happens before DB access
func TestGetUserChartData_InvalidUserID(t *testing.T) {
	testCases := []struct {
		name         string
		userIDParam  string
		expectedCode int
		expectedErr  string
	}{
		{
			name:         "non-numeric user ID",
			userIDParam:  "abc",
			expectedCode: http.StatusBadRequest,
			expectedErr:  "Invalid user ID parameter",
		},
		{
			name:         "empty user ID",
			userIDParam:  "",
			expectedCode: http.StatusBadRequest,
			expectedErr:  "Invalid user ID parameter",
		},
		{
			name:         "float user ID",
			userIDParam:  "1.5",
			expectedCode: http.StatusBadRequest,
			expectedErr:  "Invalid user ID parameter",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			c, w := createMockContext("GET", "/api/charts/user/"+tc.userIDParam)
			c.Set("userID", 1)
			c.Params = gin.Params{{Key: "userId", Value: tc.userIDParam}}

			services.GetUserChartData(c)

			assert.Equal(t, tc.expectedCode, w.Code)

			var response map[string]string
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, tc.expectedErr, response["error"])
		})
	}
}

// TestGetUserChartData_MissingAuth tests when no userID is in context
func TestGetUserChartData_MissingAuth(t *testing.T) {
	c, w := createMockContext("GET", "/api/charts/user/1")
	c.Params = gin.Params{{Key: "userId", Value: "1"}}
	// Not setting userID in context

	services.GetUserChartData(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "Unauthorized", response["error"])
}

// TestGetUserChartData_InvalidAuthUserID tests when userID in context is not an int
func TestGetUserChartData_InvalidAuthUserID(t *testing.T) {
	c, w := createMockContext("GET", "/api/charts/user/1")
	c.Set("userID", "not-an-int") // Wrong type
	c.Params = gin.Params{{Key: "userId", Value: "1"}}

	services.GetUserChartData(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "Invalid user ID", response["error"])
}

// TestGetUserChartData_AllIntervals tests that all interval values work correctly
func TestGetUserChartData_AllIntervals(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_intervals")
	userID := testutil.CreateTestUserWithDefaults(t, email, "student")
	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	intervals := []string{"day", "week", "month", "year", "all"}

	for _, interval := range intervals {
		t.Run("interval_"+interval, func(t *testing.T) {
			c, w := createMockContext("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?interval="+interval)
			c.Request = httptest.NewRequest("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?interval="+interval, nil)
			c.Set("userID", userID)
			c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

			services.GetUserChartData(c)

			assert.Equal(t, http.StatusOK, w.Code, "Failed for interval: %s", interval)

			var response dtos.MultiMetricChartData
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
		})
	}
}

// TestGetUserChartData_InvalidInterval tests that invalid intervals are rejected
func TestGetUserChartData_InvalidInterval(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_invalid_interval")
	userID := testutil.CreateTestUserWithDefaults(t, email, "student")

	c, w := createMockContext("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?interval=invalid")
	c.Request = httptest.NewRequest("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?interval=invalid", nil)
	c.Set("userID", userID)
	c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

	services.GetUserChartData(c)

	assert.Equal(t, http.StatusBadRequest, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Contains(t, response["error"], "invalid interval")
}

// TestGetUserChartData_InvalidDays tests handling of invalid days parameter
func TestGetUserChartData_InvalidDays(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_invalid_days")
	userID := testutil.CreateTestUserWithDefaults(t, email, "student")

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
			c, w := createMockContext("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?days="+tc.days)
			c.Request = httptest.NewRequest("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?days="+tc.days, nil)
			c.Set("userID", userID)
			c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

			services.GetUserChartData(c)

			assert.Equal(t, http.StatusBadRequest, w.Code)

			var response map[string]string
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.Equal(t, "Invalid days parameter", response["error"])
		})
	}
}

// TestGetUserChartData_NoEntries tests that empty arrays are returned for users with no entries
func TestGetUserChartData_NoEntries(t *testing.T) {
	testutil.SetupTestDB(t)

	// Create a user with no entries
	email := testutil.UniqueEmail(t, "chart_no_entries")
	userID := testutil.CreateTestUserWithDefaults(t, email, "student")

	c, w := createMockContext("GET", "/api/charts/user/"+strconv.Itoa(userID))
	c.Set("userID", userID)
	c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

	services.GetUserChartData(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response dtos.MultiMetricChartData
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// All arrays should be empty (or nil) but response should be valid
	assert.Empty(t, response.NPM)
	assert.Empty(t, response.Accuracy)
	assert.Empty(t, response.SessionCount)
	assert.Empty(t, response.TotalQuestions)
}

// TestGetUserChartData_WithEntries tests that data is returned for users with entries
func TestGetUserChartData_WithEntries(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_with_entries")
	userID := testutil.CreateTestUserWithDefaults(t, email, "student")

	// Create multiple entries with different values
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

	c, w := createMockContext("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?interval=all")
	c.Request = httptest.NewRequest("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?interval=all", nil)
	c.Set("userID", userID)
	c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

	services.GetUserChartData(c)

	assert.Equal(t, http.StatusOK, w.Code)

	var response dtos.MultiMetricChartData
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// Should have 3 entries in each array
	assert.Len(t, response.NPM, 3)
	assert.Len(t, response.Accuracy, 3)
	assert.Len(t, response.SessionCount, 3)
	assert.Len(t, response.TotalQuestions, 3)

	// Verify data values are reasonable (NPM values)
	npmValues := make([]float64, len(response.NPM))
	for i, point := range response.NPM {
		npmValues[i] = point.Value
	}
	// We expect NPM values 3.5, 4.0, and 5.0 (in some order based on timestamp)
	assert.Contains(t, npmValues, 3.5)
	assert.Contains(t, npmValues, 4.0)
	assert.Contains(t, npmValues, 5.0)

	// Verify total questions values
	totalQValues := make([]float64, len(response.TotalQuestions))
	for i, point := range response.TotalQuestions {
		totalQValues[i] = point.Value
	}
	assert.Contains(t, totalQValues, float64(20))
	assert.Contains(t, totalQValues, float64(40))
	assert.Contains(t, totalQValues, float64(15))
}

// TestGetTeacherClassChartData_Success tests that a teacher can fetch class data
func TestGetTeacherClassChartData_Success(t *testing.T) {
	testutil.SetupTestDB(t)

	// Create a teacher
	teacherEmail := testutil.UniqueEmail(t, "teacher_chart_success")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "teacher")

	// Create a student
	studentEmail := testutil.UniqueEmail(t, "student_chart_success")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "student")

	// Associate teacher with student
	testutil.CreateTeacherStudentAssociation(t, teacherID, studentID)

	// Create an entry for the student
	testutil.CreateTestNoteGameEntryWithDefaults(t, studentID)

	c, w := createMockContext("GET", "/api/charts/class")
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
		{name: "student", role: "student"},
		{name: "parent", role: "parent"},
		{name: "admin", role: "admin"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			email := testutil.UniqueEmail(t, "non_teacher_"+tc.name)
			userID := testutil.CreateTestUserWithDefaults(t, email, tc.role)

			c, w := createMockContext("GET", "/api/charts/class")
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
	c, w := createMockContext("GET", "/api/charts/class")
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
	c, w := createMockContext("GET", "/api/charts/class")
	c.Set("userID", "not-an-int") // Wrong type

	services.GetTeacherClassChartData(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var response map[string]string
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)
	assert.Equal(t, "Invalid user ID", response["error"])
}

// TestGetTeacherClassChartData_NoStudents tests that empty data is returned when teacher has no students
func TestGetTeacherClassChartData_NoStudents(t *testing.T) {
	testutil.SetupTestDB(t)

	// Create a teacher with no students
	teacherEmail := testutil.UniqueEmail(t, "teacher_no_students")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "teacher")

	c, w := createMockContext("GET", "/api/charts/class")
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
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "teacher")

	// Create multiple students
	student1Email := testutil.UniqueEmail(t, "student1_with_entries")
	student1ID := testutil.CreateTestUserWithDefaults(t, student1Email, "student")

	student2Email := testutil.UniqueEmail(t, "student2_with_entries")
	student2ID := testutil.CreateTestUserWithDefaults(t, student2Email, "student")

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

	c, w := createMockContext("GET", "/api/charts/class?interval=all")
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
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "teacher")

	studentEmail := testutil.UniqueEmail(t, "student_intervals")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "student")

	testutil.CreateTeacherStudentAssociation(t, teacherID, studentID)
	testutil.CreateTestNoteGameEntryWithDefaults(t, studentID)

	intervals := []string{"day", "week", "month", "year", "all"}

	for _, interval := range intervals {
		t.Run("interval_"+interval, func(t *testing.T) {
			c, w := createMockContext("GET", "/api/charts/class?interval="+interval)
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
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "teacher")

	c, w := createMockContext("GET", "/api/charts/class?interval=invalid")
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
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "teacher")

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
			c, w := createMockContext("GET", "/api/charts/class?days="+tc.days)
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
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "teacher")

	// Create students with no entries
	student1Email := testutil.UniqueEmail(t, "student_no_entry1")
	student1ID := testutil.CreateTestUserWithDefaults(t, student1Email, "student")

	student2Email := testutil.UniqueEmail(t, "student_no_entry2")
	student2ID := testutil.CreateTestUserWithDefaults(t, student2Email, "student")

	// Associate teacher with students
	testutil.CreateTeacherStudentAssociation(t, teacherID, student1ID)
	testutil.CreateTeacherStudentAssociation(t, teacherID, student2ID)

	c, w := createMockContext("GET", "/api/charts/class")
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

// TestGetUserChartData_DefaultQueryParams tests default query parameter values
func TestGetUserChartData_DefaultQueryParams(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_default_params")
	userID := testutil.CreateTestUserWithDefaults(t, email, "student")
	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	// Don't provide any query parameters - should use defaults (interval=day, days=30)
	c, w := createMockContext("GET", "/api/charts/user/"+strconv.Itoa(userID))
	c.Set("userID", userID)
	c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

	services.GetUserChartData(c)

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

// TestGetTeacherClassChartData_DefaultQueryParams tests default query parameter values for teacher
func TestGetTeacherClassChartData_DefaultQueryParams(t *testing.T) {
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "teacher_default_params")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "teacher")

	// Don't provide any query parameters - should use defaults (interval=day, days=30)
	c, w := createMockContext("GET", "/api/charts/class")
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

// TestGetUserChartData_CustomDays tests custom days parameter
func TestGetUserChartData_CustomDays(t *testing.T) {
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_custom_days")
	userID := testutil.CreateTestUserWithDefaults(t, email, "student")
	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	testCases := []struct {
		name string
		days string
	}{
		{name: "7 days", days: "7"},
		{name: "14 days", days: "14"},
		{name: "30 days", days: "30"},
		{name: "90 days", days: "90"},
		{name: "365 days", days: "365"},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			c, w := createMockContext("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?days="+tc.days)
			c.Request = httptest.NewRequest("GET", "/api/charts/user/"+strconv.Itoa(userID)+"?days="+tc.days, nil)
			c.Set("userID", userID)
			c.Params = gin.Params{{Key: "userId", Value: strconv.Itoa(userID)}}

			services.GetUserChartData(c)

			assert.Equal(t, http.StatusOK, w.Code)

			var response dtos.MultiMetricChartData
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
		})
	}
}
