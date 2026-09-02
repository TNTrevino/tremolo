package tests

import (
	"context"
	"errors"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

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

	teachers, err := services.GetTeachers(context.Background(), database.Queries)
	require.NoError(t, err)

	// Verify we got teachers (at least the ones we created)
	assert.GreaterOrEqual(t, len(teachers), 2, "Expected at least 2 teachers")

	// Verify all returned users have teacher-related data
	for _, teacher := range teachers {
		assert.NotEmpty(t, teacher.FirstName, "Expected teacher to have a first name")
		assert.NotEmpty(t, teacher.LastName, "Expected teacher to have a last name")
	}
}

// TestGetTeachers_NoTeachers tests that GetTeachers succeeds with an
// empty (or existing) list when no teachers exist
func TestGetTeachers_NoTeachers(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Note: This test assumes we can isolate the test environment.
	// In a shared database, there may be existing teachers from other tests.
	// For this test, we verify the service works correctly and returns a valid response.
	teachers, err := services.GetTeachers(context.Background(), database.Queries)

	require.NoError(t, err)
	assert.NotNil(t, teachers)
}

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

	teacher, err := services.GetTeacher(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, teacher)

	// Verify teacher data
	require.NotNil(t, teacher.ID, "Expected teacher ID to be set")
	assert.Equal(t, userID, int(*teacher.ID))
	assert.Equal(t, "Charlie", teacher.FirstName)
	assert.Equal(t, "Brown", teacher.LastName)
}

// TestGetTeacher_NotFound tests that GetTeacher returns ErrNotFound for a non-existent ID
func TestGetTeacher_NotFound(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Use a very large ID that is unlikely to exist
	teacher, err := services.GetTeacher(context.Background(), database.Queries, 99999999)

	assert.Nil(t, teacher)
	assert.True(t, errors.Is(err, services.ErrNotFound), "expected ErrNotFound, got: %v", err)
}

// TestGetTeacher_NegativeID tests that GetTeacher handles negative IDs correctly
func TestGetTeacher_NegativeID(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Negative IDs are valid integers, so the service will try to find the user
	// and should return ErrNotFound since no user has a negative ID
	teacher, err := services.GetTeacher(context.Background(), database.Queries, -1)

	assert.Nil(t, teacher)
	assert.True(t, errors.Is(err, services.ErrNotFound), "expected ErrNotFound, got: %v", err)
}

// TestGetTeacher_ZeroID tests that GetTeacher handles zero ID correctly
func TestGetTeacher_ZeroID(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Zero is a valid integer, so the service will try to find the user
	// and should return ErrNotFound since no user typically has ID 0
	teacher, err := services.GetTeacher(context.Background(), database.Queries, 0)

	assert.Nil(t, teacher)
	assert.True(t, errors.Is(err, services.ErrNotFound), "expected ErrNotFound, got: %v", err)
}

// TestGetTeacher_VeryLargeID tests that GetTeacher handles very large IDs correctly
func TestGetTeacher_VeryLargeID(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// Max int32, since the DB column is int32-backed
	teacher, err := services.GetTeacher(context.Background(), database.Queries, 2147483647)

	assert.Nil(t, teacher)
	assert.True(t, errors.Is(err, services.ErrNotFound), "expected ErrNotFound, got: %v", err)
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

	teachers, err := services.GetTeachers(context.Background(), database.Queries)
	require.NoError(t, err)

	// Verify that the response contains our teacher
	foundTeacher := false
	for _, teacher := range teachers {
		if teacher.FirstName == "TeacherOnly" && teacher.LastName == "Test" {
			foundTeacher = true
			assert.Equal(t, dtos.Teacher, teacher.Role)
		}
		// Verify no students or parents are in the teacher list
		assert.NotEqual(t, "StudentOnly", teacher.FirstName, "Found non-teacher user in teachers list: %s %s", teacher.FirstName, teacher.LastName)
		assert.NotEqual(t, "ParentOnly", teacher.FirstName, "Found non-teacher user in teachers list: %s %s", teacher.FirstName, teacher.LastName)
	}

	assert.True(t, foundTeacher, "Expected to find the test teacher in the response")
}
