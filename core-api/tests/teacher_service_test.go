package tests

import (
	"context"
	"errors"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// createTestSchool creates a school for CreateUserRequest's required
// SchoolID field and returns its ID.
func createTestSchool(t *testing.T) int16 {
	t.Helper()
	schoolID, err := database.Queries.CreateSchool(context.Background(), generated.CreateSchoolParams{
		Title:   "Test School",
		City:    "Austin",
		County:  "Travis",
		State:   "TX",
		Country: "US",
	})
	require.NoError(t, err)
	return int16(schoolID)
}

// TestCreateUser_Success tests successful user creation with valid data,
// and proves the supplied password is actually hashed and stored (the
// bug this refactor fixes: POST /user used to store a NULL password).
func TestCreateUser_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "create_user_success")
	schoolID := createTestSchool(t)

	reqBody := &dtos.CreateUserRequest{
		FirstName: "John",
		LastName:  "Doe",
		Role:      dtos.Student,
		Email:     email,
		Password:  "ValidPass123!",
		SchoolID:  schoolID,
	}

	result, err := services.CreateUser(context.Background(), database.Queries, reqBody)
	require.NoError(t, err)
	require.NotNil(t, result)
	t.Cleanup(func() { testutil.DeleteTestUser(t, result.ID) })

	assert.Equal(t, "John", result.FirstName)
	assert.Equal(t, "Doe", result.LastName)
	assert.Equal(t, "STUDENT", result.Role)

	stored := testutil.GetTestUserByEmail(t, email)
	require.NotNil(t, stored, "expected the created user to be persisted")
	require.NotEmpty(t, stored.Password, "expected a password hash to be stored")

	err = bcrypt.CompareHashAndPassword([]byte(stored.Password), []byte("ValidPass123!"))
	assert.NoError(t, err, "stored password should be a valid bcrypt hash of the supplied password")
}

// TestCreateUser_ValidationError tests user creation with invalid user data
func TestCreateUser_ValidationError(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	schoolID := createTestSchool(t)

	testCases := []struct {
		name    string
		reqBody dtos.CreateUserRequest
	}{
		{
			name: "Missing FirstName",
			reqBody: dtos.CreateUserRequest{
				FirstName: "",
				LastName:  "Doe",
				Role:      dtos.Student,
				Email:     "test@example.com",
				Password:  "ValidPass123!",
				SchoolID:  schoolID,
			},
		},
		{
			name: "Missing LastName",
			reqBody: dtos.CreateUserRequest{
				FirstName: "John",
				LastName:  "",
				Role:      dtos.Student,
				Email:     "test@example.com",
				Password:  "ValidPass123!",
				SchoolID:  schoolID,
			},
		},
		{
			name: "Invalid Role",
			reqBody: dtos.CreateUserRequest{
				FirstName: "John",
				LastName:  "Doe",
				Role:      "INVALID_ROLE",
				Email:     "test@example.com",
				Password:  "ValidPass123!",
				SchoolID:  schoolID,
			},
		},
		{
			name: "Missing Email",
			reqBody: dtos.CreateUserRequest{
				FirstName: "John",
				LastName:  "Doe",
				Role:      dtos.Student,
				Email:     "",
				Password:  "ValidPass123!",
				SchoolID:  schoolID,
			},
		},
		{
			name: "Invalid Email Format",
			reqBody: dtos.CreateUserRequest{
				FirstName: "John",
				LastName:  "Doe",
				Role:      dtos.Student,
				Email:     "not-an-email",
				Password:  "ValidPass123!",
				SchoolID:  schoolID,
			},
		},
		{
			name: "FirstName with numbers",
			reqBody: dtos.CreateUserRequest{
				FirstName: "John123",
				LastName:  "Doe",
				Role:      dtos.Student,
				Email:     "test@example.com",
				Password:  "ValidPass123!",
				SchoolID:  schoolID,
			},
		},
		{
			name: "LastName with numbers",
			reqBody: dtos.CreateUserRequest{
				FirstName: "John",
				LastName:  "Doe456",
				Role:      dtos.Student,
				Email:     "test@example.com",
				Password:  "ValidPass123!",
				SchoolID:  schoolID,
			},
		},
		{
			name: "Missing Password",
			reqBody: dtos.CreateUserRequest{
				FirstName: "John",
				LastName:  "Doe",
				Role:      dtos.Student,
				Email:     "test@example.com",
				Password:  "",
				SchoolID:  schoolID,
			},
		},
		{
			name: "Weak Password",
			reqBody: dtos.CreateUserRequest{
				FirstName: "John",
				LastName:  "Doe",
				Role:      dtos.Student,
				Email:     "test@example.com",
				Password:  "weak",
				SchoolID:  schoolID,
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			result, err := services.CreateUser(context.Background(), database.Queries, &tc.reqBody)

			require.Error(t, err)
			assert.Nil(t, result)
			assert.True(t, errors.Is(err, services.ErrValidation), "expected ErrValidation, got: %v", err)
		})
	}
}

// TestCreateUser_AdminRoleForbidden tests that creating an ADMIN user is
// rejected regardless of the caller's own role check (which happens
// above this function, in the controller/adminOnly wrapper).
func TestCreateUser_AdminRoleForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	schoolID := createTestSchool(t)

	reqBody := &dtos.CreateUserRequest{
		FirstName: "New",
		LastName:  "Admin",
		Role:      dtos.Admin,
		Email:     testutil.UniqueEmail(t, "create_user_admin_forbidden"),
		Password:  "ValidPass123!",
		SchoolID:  schoolID,
	}

	result, err := services.CreateUser(context.Background(), database.Queries, reqBody)

	require.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, services.ErrForbidden), "expected ErrForbidden, got: %v", err)
}

// TestGetStudents_Success tests fetching all students successfully
func TestGetStudents_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Create some test students
	email1 := testutil.UniqueEmail(t, "get_students_success_1")
	testutil.CreateTestUserWithDefaults(t, email1, "STUDENT")

	email2 := testutil.UniqueEmail(t, "get_students_success_2")
	testutil.CreateTestUserWithDefaults(t, email2, "STUDENT")

	students, err := services.GetStudents(context.Background(), database.Queries)
	require.NoError(t, err)

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

	students, err := services.GetStudents(context.Background(), database.Queries)

	// Even if no students exist, it should succeed with an empty or non-empty list
	require.NoError(t, err)
	assert.NotNil(t, students)
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

	students, err := services.GetStudents(context.Background(), database.Queries)
	require.NoError(t, err)

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

	student, err := services.GetStudent(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, student)

	assert.Equal(t, "SpecificStudent", student.FirstName)
	assert.Equal(t, "TestLast", student.LastName)
	assert.Equal(t, dtos.Student, student.Role)
}

// TestGetStudent_NotFound tests fetching a non-existent student ID
func TestGetStudent_NotFound(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Use a very large ID that is unlikely to exist
	student, err := services.GetStudent(context.Background(), database.Queries, 99999999)

	assert.Nil(t, student)
	assert.True(t, errors.Is(err, services.ErrNotFound), "expected ErrNotFound, got: %v", err)
}

// TestGetStudent_NegativeID tests fetching with a negative ID, which is a
// valid int but can never match a real user.
func TestGetStudent_NegativeID(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	student, err := services.GetStudent(context.Background(), database.Queries, -1)

	assert.Nil(t, student)
	assert.True(t, errors.Is(err, services.ErrNotFound), "expected ErrNotFound, got: %v", err)
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

	// Should be ErrNotFound because GetStudent looks for a user with role "STUDENT"
	student, err := services.GetStudent(context.Background(), database.Queries, userID)

	assert.Nil(t, student)
	assert.True(t, errors.Is(err, services.ErrNotFound), "expected ErrNotFound, got: %v", err)
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

	student, err := services.GetStudent(context.Background(), database.Queries, userID)

	assert.Nil(t, student)
	assert.True(t, errors.Is(err, services.ErrNotFound), "expected ErrNotFound, got: %v", err)
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

	student, err := services.GetStudent(context.Background(), database.Queries, userID)

	assert.Nil(t, student)
	assert.True(t, errors.Is(err, services.ErrNotFound), "expected ErrNotFound, got: %v", err)
}
