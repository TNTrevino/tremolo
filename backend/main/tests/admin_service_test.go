package tests

import (
	"encoding/json"
	"net/http"
	"strconv"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// GetTeachers Tests
// ============================================================================

// TestGetTeachers_Success tests that GetTeachers returns a list of teachers
func TestGetTeachers_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Create test teachers
	email1 := testutil.UniqueEmail(t, "admin_teacher1")
	email2 := testutil.UniqueEmail(t, "admin_teacher2")

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email1,
		Password:  "TestPass123!",
		FirstName: "Alice",
		LastName:  "Smith",
		Role:      "TEACHER",
	})

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email2,
		Password:  "TestPass123!",
		FirstName: "Bob",
		LastName:  "Jones",
		Role:      "TEACHER",
	})

	// Create test context
	c, w := testutil.CreateGinContext(http.MethodGet, "/teachers")

	// Call the service
	services.GetTeachers(c)

	// Verify response status
	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	// Parse response
	var teachers []dtos.User
	err := json.Unmarshal(w.Body.Bytes(), &teachers)
	require.NoError(t, err, "Failed to parse JSON response")

	// Verify we got teachers (at least the ones we created)
	assert.GreaterOrEqual(t, len(teachers), 2, "Expected at least 2 teachers")

	// Verify all returned users have teacher-related data
	for _, teacher := range teachers {
		assert.NotEmpty(t, teacher.FirstName, "Expected teacher to have a first name")
		assert.NotEmpty(t, teacher.LastName, "Expected teacher to have a last name")
	}
}

// TestGetTeachers_NoTeachers tests that GetTeachers returns an empty list when no teachers exist
func TestGetTeachers_NoTeachers(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Note: This test assumes we can isolate the test environment.
	// In a shared database, there may be existing teachers from other tests.
	// For this test, we verify the endpoint works correctly and returns a valid response.

	// Create test context
	c, w := testutil.CreateGinContext(http.MethodGet, "/teachers")

	// Call the service
	services.GetTeachers(c)

	// Verify response is either OK with empty/non-empty array
	// The service returns 404 when GetUsersByRole returns an error,
	// or 200 with an array (possibly empty or with existing teachers)
	assert.Contains(t, []int{http.StatusOK, http.StatusNotFound}, w.Code, "Response body: %s", w.Body.String())

	if w.Code == http.StatusOK {
		// Parse response to verify it's a valid JSON array
		var teachers []dtos.User
		err := json.Unmarshal(w.Body.Bytes(), &teachers)
		require.NoError(t, err, "Failed to parse JSON response")
		// Response is valid - teachers slice can be empty or contain data
	}
}

// ============================================================================
// GetTeacher Tests
// ============================================================================

// TestGetTeacher_Success tests that GetTeacher returns a specific teacher by ID
func TestGetTeacher_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Create a test teacher
	email := testutil.UniqueEmail(t, "admin_get_teacher")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "Charlie",
		LastName:  "Brown",
		Role:      "TEACHER",
	})

	// Create test context with URL parameter
	c, w := testutil.CreateGinContextWithParams(http.MethodGet, "/teachers/"+strconv.Itoa(userID), gin.Params{
		{Key: "id", Value: strconv.Itoa(userID)},
	})

	// Call the service
	services.GetTeacher(c)

	// Verify response status
	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	// Parse response
	var teacher dtos.User
	err := json.Unmarshal(w.Body.Bytes(), &teacher)
	require.NoError(t, err, "Failed to parse JSON response")

	// Verify teacher data
	require.NotNil(t, teacher.ID, "Expected teacher ID to be set")
	assert.Equal(t, userID, int(*teacher.ID))
	assert.Equal(t, "Charlie", teacher.FirstName)
	assert.Equal(t, "Brown", teacher.LastName)
}

// TestGetTeacher_NotFound tests that GetTeacher returns 404 for non-existent ID
func TestGetTeacher_NotFound(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Use a very large ID that is unlikely to exist
	nonExistentID := 99999999

	// Create test context with non-existent ID
	c, w := testutil.CreateGinContextWithParams(http.MethodGet, "/teachers/"+strconv.Itoa(nonExistentID), gin.Params{
		{Key: "id", Value: strconv.Itoa(nonExistentID)},
	})

	// Call the service
	services.GetTeacher(c)

	// Verify response status
	assert.Equal(t, http.StatusNotFound, w.Code, "Response body: %s", w.Body.String())

	// Parse response
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err, "Failed to parse JSON response")

	// Verify error response
	assert.Equal(t, true, response["error"])
	assert.Equal(t, "not found", response["message"])
}

// TestGetTeacher_InvalidID tests that GetTeacher returns error for invalid ID format
func TestGetTeacher_InvalidID(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	testCases := []struct {
		name      string
		invalidID string
	}{
		{"Alphabetic ID", "abc"},
		{"Special characters", "12@34"},
		{"Empty string", ""},
		{"Floating point", "12.34"},
		{"Negative symbol only", "-"},
		{"Mixed alphanumeric", "12abc"},
	}

	for _, tc := range testCases {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			// Create test context with invalid ID
			c, w := testutil.CreateGinContextWithParams(http.MethodGet, "/teachers/"+tc.invalidID, gin.Params{
				{Key: "id", Value: tc.invalidID},
			})

			// Call the service
			services.GetTeacher(c)

			// Verify response status - should be 422 Unprocessable Entity
			assert.Equal(t, http.StatusUnprocessableEntity, w.Code, "Response body: %s", w.Body.String())

			// Parse response
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err, "Failed to parse JSON response")

			// Verify error response
			assert.Equal(t, true, response["error"])
			assert.Equal(t, "Invalid request body", response["message"])
		})
	}
}

// ============================================================================
// GetSchoolStudents Tests
// ============================================================================

// TestGetSchoolStudents_Success tests that GetSchoolStudents returns a list of students
func TestGetSchoolStudents_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Create test students
	email1 := testutil.UniqueEmail(t, "admin_student1")
	email2 := testutil.UniqueEmail(t, "admin_student2")
	email3 := testutil.UniqueEmail(t, "admin_student3")

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email1,
		Password:  "TestPass123!",
		FirstName: "David",
		LastName:  "Miller",
		Role:      "STUDENT",
	})

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email2,
		Password:  "TestPass123!",
		FirstName: "Emma",
		LastName:  "Wilson",
		Role:      "STUDENT",
	})

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email3,
		Password:  "TestPass123!",
		FirstName: "Frank",
		LastName:  "Taylor",
		Role:      "STUDENT",
	})

	// Create test context
	c, w := testutil.CreateGinContext(http.MethodGet, "/students")

	// Call the service
	services.GetSchoolStudents(c)

	// Verify response status
	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	// Parse response
	var students []dtos.User
	err := json.Unmarshal(w.Body.Bytes(), &students)
	require.NoError(t, err, "Failed to parse JSON response")

	// Verify we got students (at least the ones we created)
	assert.GreaterOrEqual(t, len(students), 3, "Expected at least 3 students")

	// Verify all returned users have student-related data
	for _, student := range students {
		assert.NotEmpty(t, student.FirstName, "Expected student to have a first name")
		assert.NotEmpty(t, student.LastName, "Expected student to have a last name")
	}
}

// TestGetSchoolStudents_NoStudents tests that GetSchoolStudents returns an empty list when no students exist
func TestGetSchoolStudents_NoStudents(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Note: This test assumes we can isolate the test environment.
	// In a shared database, there may be existing students from other tests.
	// For this test, we verify the endpoint works correctly and returns a valid response.

	// Create test context
	c, w := testutil.CreateGinContext(http.MethodGet, "/students")

	// Call the service
	services.GetSchoolStudents(c)

	// Verify response is either OK with empty/non-empty array
	// The service returns 404 when GetUsersByRole returns an error,
	// or 200 with an array (possibly empty or with existing students)
	assert.Contains(t, []int{http.StatusOK, http.StatusNotFound}, w.Code, "Response body: %s", w.Body.String())

	if w.Code == http.StatusOK {
		// Parse response to verify it's a valid JSON array
		var students []dtos.User
		err := json.Unmarshal(w.Body.Bytes(), &students)
		require.NoError(t, err, "Failed to parse JSON response")
		// Response is valid - students slice can be empty or contain data
	}
}

// ============================================================================
// GetSchoolTeachers Tests (same as GetTeachers)
// ============================================================================

// TestGetSchoolTeachers_Success tests that GetSchoolTeachers returns a list of teachers
func TestGetSchoolTeachers_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Create test teachers
	email1 := testutil.UniqueEmail(t, "school_teacher1")
	email2 := testutil.UniqueEmail(t, "school_teacher2")

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email1,
		Password:  "TestPass123!",
		FirstName: "Grace",
		LastName:  "Lee",
		Role:      "TEACHER",
	})

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email2,
		Password:  "TestPass123!",
		FirstName: "Henry",
		LastName:  "Chen",
		Role:      "TEACHER",
	})

	// Create test context
	c, w := testutil.CreateGinContext(http.MethodGet, "/school/teachers")

	// Call the service
	services.GetSchoolTeachers(c)

	// Verify response status
	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	// Parse response
	var teachers []dtos.User
	err := json.Unmarshal(w.Body.Bytes(), &teachers)
	require.NoError(t, err, "Failed to parse JSON response")

	// Verify we got teachers (at least the ones we created)
	assert.GreaterOrEqual(t, len(teachers), 2, "Expected at least 2 teachers")

	// Verify all returned users have teacher-related data
	for _, teacher := range teachers {
		assert.NotEmpty(t, teacher.FirstName, "Expected teacher to have a first name")
		assert.NotEmpty(t, teacher.LastName, "Expected teacher to have a last name")
	}
}

// ============================================================================
// Additional Edge Case Tests
// ============================================================================

// TestGetTeacher_NegativeID tests that GetTeacher handles negative IDs correctly
func TestGetTeacher_NegativeID(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Create test context with negative ID
	c, w := testutil.CreateGinContextWithParams(http.MethodGet, "/teachers/-1", gin.Params{
		{Key: "id", Value: "-1"},
	})

	// Call the service
	services.GetTeacher(c)

	// Negative IDs are valid integers, so the service will try to find the user
	// and should return 404 since no user has a negative ID
	assert.Equal(t, http.StatusNotFound, w.Code, "Response body: %s", w.Body.String())
}

// TestGetTeacher_ZeroID tests that GetTeacher handles zero ID correctly
func TestGetTeacher_ZeroID(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Create test context with zero ID
	c, w := testutil.CreateGinContextWithParams(http.MethodGet, "/teachers/0", gin.Params{
		{Key: "id", Value: "0"},
	})

	// Call the service
	services.GetTeacher(c)

	// Zero is a valid integer, so the service will try to find the user
	// and should return 404 since no user typically has ID 0
	assert.Equal(t, http.StatusNotFound, w.Code, "Response body: %s", w.Body.String())
}

// TestGetTeacher_VeryLargeID tests that GetTeacher handles very large IDs correctly
func TestGetTeacher_VeryLargeID(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Create test context with very large ID
	largeID := "9223372036854775807" // Max int64

	c, w := testutil.CreateGinContextWithParams(http.MethodGet, "/teachers/"+largeID, gin.Params{
		{Key: "id", Value: largeID},
	})

	// Call the service
	services.GetTeacher(c)

	// Should return 404 since this user doesn't exist
	assert.Equal(t, http.StatusNotFound, w.Code, "Response body: %s", w.Body.String())
}

// TestGetTeachers_VerifyRoleFiltering tests that GetTeachers only returns teachers, not other roles
func TestGetTeachers_VerifyRoleFiltering(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Create users with different roles
	teacherEmail := testutil.UniqueEmail(t, "role_filter_teacher")
	studentEmail := testutil.UniqueEmail(t, "role_filter_student")
	parentEmail := testutil.UniqueEmail(t, "role_filter_parent")

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     teacherEmail,
		Password:  "TestPass123!",
		FirstName: "TeacherOnly",
		LastName:  "Test",
		Role:      "TEACHER",
	})

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     studentEmail,
		Password:  "TestPass123!",
		FirstName: "StudentOnly",
		LastName:  "Test",
		Role:      "STUDENT",
	})

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     parentEmail,
		Password:  "TestPass123!",
		FirstName: "ParentOnly",
		LastName:  "Test",
		Role:      "PARENT",
	})

	// Create test context
	c, w := testutil.CreateGinContext(http.MethodGet, "/teachers")

	// Call the service
	services.GetTeachers(c)

	// Verify response status
	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	// Parse response
	var teachers []dtos.User
	err := json.Unmarshal(w.Body.Bytes(), &teachers)
	require.NoError(t, err, "Failed to parse JSON response")

	// Verify that the response contains our teacher
	foundTeacher := false
	for _, teacher := range teachers {
		if teacher.FirstName == "TeacherOnly" && teacher.LastName == "Test" {
			foundTeacher = true
		}
		// Verify no students or parents are in the teacher list
		assert.NotEqual(t, "StudentOnly", teacher.FirstName, "Found non-teacher user in teachers list: %s %s", teacher.FirstName, teacher.LastName)
		assert.NotEqual(t, "ParentOnly", teacher.FirstName, "Found non-teacher user in teachers list: %s %s", teacher.FirstName, teacher.LastName)
	}

	assert.True(t, foundTeacher, "Expected to find the test teacher in the response")
}

// TestGetSchoolStudents_VerifyRoleFiltering tests that GetSchoolStudents only returns students, not other roles
func TestGetSchoolStudents_VerifyRoleFiltering(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Create users with different roles
	teacherEmail := testutil.UniqueEmail(t, "student_filter_teacher")
	studentEmail := testutil.UniqueEmail(t, "student_filter_student")
	parentEmail := testutil.UniqueEmail(t, "student_filter_parent")

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     teacherEmail,
		Password:  "TestPass123!",
		FirstName: "TeacherNotStudent",
		LastName:  "Test",
		Role:      "TEACHER",
	})

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     studentEmail,
		Password:  "TestPass123!",
		FirstName: "StudentFound",
		LastName:  "Test",
		Role:      "STUDENT",
	})

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     parentEmail,
		Password:  "TestPass123!",
		FirstName: "ParentNotStudent",
		LastName:  "Test",
		Role:      "PARENT",
	})

	// Create test context
	c, w := testutil.CreateGinContext(http.MethodGet, "/students")

	// Call the service
	services.GetSchoolStudents(c)

	// Verify response status
	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	// Parse response
	var students []dtos.User
	err := json.Unmarshal(w.Body.Bytes(), &students)
	require.NoError(t, err, "Failed to parse JSON response")

	// Verify that the response contains our student
	foundStudent := false
	for _, student := range students {
		if student.FirstName == "StudentFound" && student.LastName == "Test" {
			foundStudent = true
		}
		// Verify no teachers or parents are in the student list
		assert.NotEqual(t, "TeacherNotStudent", student.FirstName, "Found non-student user in students list: %s %s", student.FirstName, student.LastName)
		assert.NotEqual(t, "ParentNotStudent", student.FirstName, "Found non-student user in students list: %s %s", student.FirstName, student.LastName)
	}

	assert.True(t, foundStudent, "Expected to find the test student in the response")
}
