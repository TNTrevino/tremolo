package tests

import (
	"bytes"
	"net/http"
	"net/http/httptest"
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
// CreateUser Tests
// ============================================================================

// TestCreateUser_Success tests successful user creation with valid data
func TestCreateUser_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "create_user_success")

	reqBody := dtos.User{
		FirstName: "John",
		LastName:  "Doe",
		Role:      dtos.Student,
		Email:     email,
		SchoolID:  1,
	}

	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.CreateUser(c)

	assert.Equal(t, http.StatusCreated, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "teacher created sucessfully", response["status"])

	body, ok := response["body"].(map[string]interface{})
	require.True(t, ok, "Expected body field in response")

	assert.Equal(t, "John", body["first_name"])
	assert.Equal(t, "Doe", body["last_name"])
	assert.Equal(t, "STUDENT", body["role"])
}

// TestCreateUser_ValidationError tests user creation with invalid user data
func TestCreateUser_ValidationError(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	testCases := []struct {
		name    string
		reqBody dtos.User
	}{
		{
			name: "Missing FirstName",
			reqBody: dtos.User{
				FirstName: "",
				LastName:  "Doe",
				Role:      dtos.Student,
				Email:     "test@example.com",
				SchoolID:  1,
			},
		},
		{
			name: "Missing LastName",
			reqBody: dtos.User{
				FirstName: "John",
				LastName:  "",
				Role:      dtos.Student,
				Email:     "test@example.com",
				SchoolID:  1,
			},
		},
		{
			name: "Invalid Role",
			reqBody: dtos.User{
				FirstName: "John",
				LastName:  "Doe",
				Role:      "INVALID_ROLE",
				Email:     "test@example.com",
				SchoolID:  1,
			},
		},
		{
			name: "Missing Email",
			reqBody: dtos.User{
				FirstName: "John",
				LastName:  "Doe",
				Role:      dtos.Student,
				Email:     "",
				SchoolID:  1,
			},
		},
		{
			name: "Invalid Email Format",
			reqBody: dtos.User{
				FirstName: "John",
				LastName:  "Doe",
				Role:      dtos.Student,
				Email:     "not-an-email",
				SchoolID:  1,
			},
		},
		{
			name: "FirstName with numbers",
			reqBody: dtos.User{
				FirstName: "John123",
				LastName:  "Doe",
				Role:      dtos.Student,
				Email:     "test@example.com",
				SchoolID:  1,
			},
		},
		{
			name: "LastName with numbers",
			reqBody: dtos.User{
				FirstName: "John",
				LastName:  "Doe456",
				Role:      dtos.Student,
				Email:     "test@example.com",
				SchoolID:  1,
			},
		},
	}

	for _, tc := range testCases {
		tc := tc // capture range variable
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", tc.reqBody)

			services.CreateUser(c)

			assert.Equal(t, http.StatusUnprocessableEntity, w.Code, "Response body: %s", w.Body.String())

			var response map[string]interface{}
			testutil.ParseJSONResponse(t, w, &response)

			assert.Equal(t, "TS.2", response["scenario"])
			assert.Equal(t, "Information invalid", response["message"])
		})
	}
}

// TestCreateUser_InvalidJSON tests user creation with malformed JSON body
func TestCreateUser_InvalidJSON(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	c, w := testutil.CreateGinContext(http.MethodPost, "/")
	c.Request = httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer([]byte("invalid json {")))
	c.Request.Header.Set("Content-Type", "application/json")

	services.CreateUser(c)

	assert.Equal(t, http.StatusUnprocessableEntity, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "TS.1", response["scenario"])
	assert.Equal(t, "Invalid json body", response["message"])
}

// ============================================================================
// GetStudents Tests
// ============================================================================

// TestGetStudents_Success tests fetching all students successfully
func TestGetStudents_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Create some test students
	email1 := testutil.UniqueEmail(t, "get_students_success_1")
	testutil.CreateTestUserWithDefaults(t, email1, "STUDENT")

	email2 := testutil.UniqueEmail(t, "get_students_success_2")
	testutil.CreateTestUserWithDefaults(t, email2, "STUDENT")

	c, w := testutil.CreateGinContext(http.MethodGet, "/")

	services.GetStudents(c)

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var students []dtos.User
	testutil.ParseJSONResponse(t, w, &students)

	// Should have at least the 2 students we created
	assert.GreaterOrEqual(t, len(students), 2, "Expected at least 2 students")

	// Verify all returned users are students
	for _, student := range students {
		assert.Equal(t, dtos.Student, student.Role)
	}
}

// TestGetStudents_NoStudents tests fetching students when no students exist
// Note: This test assumes we can have a clean state where no students exist
// In practice, this might be difficult due to other tests creating students
func TestGetStudents_NoStudents(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	c, w := testutil.CreateGinContext(http.MethodGet, "/")

	services.GetStudents(c)

	// Even if no students exist, it should return 200 OK with an empty or null list
	// The current implementation returns 200 OK on success
	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())
}

// TestGetStudents_VerifyStudentData tests that student data is correctly returned
func TestGetStudents_VerifyStudentData(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "get_students_verify")
	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "StudentFirst",
		LastName:  "StudentLast",
		Role:      "STUDENT",
	})

	c, w := testutil.CreateGinContext(http.MethodGet, "/")

	services.GetStudents(c)

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var students []dtos.User
	testutil.ParseJSONResponse(t, w, &students)

	// Find our created student
	var found bool
	for _, student := range students {
		if student.FirstName == "StudentFirst" && student.LastName == "StudentLast" {
			found = true
			assert.Equal(t, dtos.Student, student.Role)
			break
		}
	}

	assert.True(t, found, "Created student not found in response")
}

// ============================================================================
// GetStudent Tests
// ============================================================================

// TestGetStudent_Success tests fetching a specific student by ID successfully
func TestGetStudent_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "get_student_success")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "SpecificStudent",
		LastName:  "TestLast",
		Role:      "STUDENT",
	})

	id := strconv.Itoa(userID)
	c, w := testutil.CreateGinContextWithParams(http.MethodGet, "/students/"+id, gin.Params{{Key: "id", Value: id}})

	services.GetStudent(c)

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var student dtos.User
	testutil.ParseJSONResponse(t, w, &student)

	assert.Equal(t, "SpecificStudent", student.FirstName)
	assert.Equal(t, "TestLast", student.LastName)
	assert.Equal(t, dtos.Student, student.Role)
}

// TestGetStudent_NotFound tests fetching a non-existent student ID
func TestGetStudent_NotFound(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Use a very large ID that is unlikely to exist
	nonExistentID := "99999999"

	c, w := testutil.CreateGinContextWithParams(http.MethodGet, "/students/"+nonExistentID, gin.Params{{Key: "id", Value: nonExistentID}})

	services.GetStudent(c)

	assert.Equal(t, http.StatusNotFound, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "not found", response["message"])
}

// TestGetStudent_InvalidID tests fetching with an invalid ID format
func TestGetStudent_InvalidID(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	testCases := []struct {
		name string
		id   string
	}{
		{name: "Non-numeric ID", id: "abc"},
		{name: "Empty ID", id: ""},
		{name: "Special characters", id: "!@#$"},
		{name: "Float ID", id: "1.5"},
		{name: "Negative ID", id: "-1"},
	}

	for _, tc := range testCases {
		tc := tc // capture range variable
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			c, w := testutil.CreateGinContextWithParams(http.MethodGet, "/students/"+tc.id, gin.Params{{Key: "id", Value: tc.id}})

			services.GetStudent(c)

			assert.Equal(t, http.StatusUnprocessableEntity, w.Code, "Response body: %s", w.Body.String())

			var response map[string]interface{}
			testutil.ParseJSONResponse(t, w, &response)

			assert.Equal(t, "Invalid request body", response["message"])
		})
	}
}

// TestGetStudent_WrongRole tests fetching by ID where user exists but is not a student
func TestGetStudent_WrongRole(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Create a teacher (not a student)
	email := testutil.UniqueEmail(t, "get_student_wrong_role")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "Teacher",
		LastName:  "User",
		Role:      "TEACHER",
	})

	id := strconv.Itoa(userID)
	c, w := testutil.CreateGinContextWithParams(http.MethodGet, "/students/"+id, gin.Params{{Key: "id", Value: id}})

	services.GetStudent(c)

	// Should return 404 because GetStudent looks for a user with role "STUDENT"
	assert.Equal(t, http.StatusNotFound, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "not found", response["message"])
}

// TestGetStudent_AdminRole tests that admin users are not returned as students
func TestGetStudent_AdminRole(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "get_student_admin_role")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "Admin",
		LastName:  "User",
		Role:      "ADMIN",
	})

	id := strconv.Itoa(userID)
	c, w := testutil.CreateGinContextWithParams(http.MethodGet, "/students/"+id, gin.Params{{Key: "id", Value: id}})

	services.GetStudent(c)

	assert.Equal(t, http.StatusNotFound, w.Code, "Response body: %s", w.Body.String())
}

// TestGetStudent_ParentRole tests that parent users are not returned as students
func TestGetStudent_ParentRole(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "get_student_parent_role")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "Parent",
		LastName:  "User",
		Role:      "PARENT",
	})

	id := strconv.Itoa(userID)
	c, w := testutil.CreateGinContextWithParams(http.MethodGet, "/students/"+id, gin.Params{{Key: "id", Value: id}})

	services.GetStudent(c)

	assert.Equal(t, http.StatusNotFound, w.Code, "Response body: %s", w.Body.String())
}
