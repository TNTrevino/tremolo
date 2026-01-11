// Package testutil provides test utilities for database setup and test data creation
package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/services"
	"sync"
	"testing"
	"time"
)

var (
	setupOnce sync.Once
	setupErr  error
)

// SetupTestDB initializes the database connection for tests.
// This is idempotent and safe to call multiple times.
// Tests are skipped (not failed) when DATABASE_URL is not set.
func SetupTestDB(t *testing.T) {
	t.Helper()

	setupOnce.Do(func() {
		// Ensure DATABASE_URL is set
		if os.Getenv("DATABASE_URL") == "" {
			setupErr = fmt.Errorf("DATABASE_URL environment variable not set")
			return
		}
		database.InitializeDBConnection()
	})

	if setupErr != nil {
		t.Skip(setupErr)
	}

	if database.Queries == nil {
		t.Fatal("Database Queries is nil after initialization")
	}
}

// CreateTestUserParams holds parameters for creating a test user
type CreateTestUserParams struct {
	Email     string
	Password  string
	FirstName string
	LastName  string
	Role      string
	SchoolID  *int64
}

// CreateTestUser creates a user in the database for testing and returns the user ID.
// The password is hashed before storing.
func CreateTestUser(t *testing.T, params CreateTestUserParams) int {
	t.Helper()
	SetupTestDB(t)

	// Hash the password
	hashedPassword, err := services.HashPassword(params.Password)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}

	createParams := generated.CreateUserParams{
		FirstName: params.FirstName,
		LastName:  params.LastName,
		Email:     sql.NullString{String: params.Email, Valid: true},
		Password:  hashedPassword,
		Role:      sql.NullString{String: params.Role, Valid: true},
	}

	if params.SchoolID != nil {
		createParams.SchoolID = sql.NullInt32{Int32: int32(*params.SchoolID), Valid: true}
	}

	createdUser, err := database.Queries.CreateUser(context.Background(), createParams)
	if err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}

	// Register cleanup to delete the user after the test
	t.Cleanup(func() {
		DeleteTestUser(t, int(createdUser.ID))
	})

	return int(createdUser.ID)
}

// CreateTestUserWithDefaults creates a test user with sensible defaults
func CreateTestUserWithDefaults(t *testing.T, email, role string) int {
	t.Helper()
	return CreateTestUser(t, CreateTestUserParams{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "Test",
		LastName:  "User",
		Role:      role,
	})
}

// DeleteTestUser removes a test user from the database
func DeleteTestUser(t *testing.T, userID int) {
	t.Helper()
	if database.DBConn == nil {
		return
	}

	// First delete related note game entries
	_, err := database.DBConn.Exec("delete from tremolo.note_game_entries where user_id = $1", userID)
	if err != nil {
		t.Logf("Warning: Failed to delete note game entries for user %d: %v", userID, err)
	}

	// Delete teacher-student associations
	_, err = database.DBConn.Exec("delete from tremolo.teacher_student where teacher_id = $1 or student_id = $1", userID)
	if err != nil {
		t.Logf("Warning: Failed to delete teacher-student associations for user %d: %v", userID, err)
	}

	// Delete the user
	_, err = database.DBConn.Exec("delete from tremolo.users where id = $1", userID)
	if err != nil {
		t.Logf("Warning: Failed to delete test user %d: %v", userID, err)
	}
}

// CreateTestNoteGameEntryParams holds parameters for creating a test note game entry
type CreateTestNoteGameEntryParams struct {
	UserID           int
	TimeLength       string
	TotalQuestions   int
	CorrectQuestions int
	NotesPerMinute   float64
}

// parseTimeLength parses a time string like "00:05:00" into a time.Time
func parseTimeLength(timeStr string) (time.Time, error) {
	// Parse duration format "HH:MM:SS" - use a reference date at midnight
	refDate := time.Date(0, 1, 1, 0, 0, 0, 0, time.UTC)
	parsed, err := time.Parse("15:04:05", timeStr)
	if err != nil {
		return time.Time{}, err
	}
	// Combine reference date with parsed time
	return refDate.Add(time.Duration(parsed.Hour())*time.Hour +
		time.Duration(parsed.Minute())*time.Minute +
		time.Duration(parsed.Second())*time.Second), nil
}

// CreateTestNoteGameEntry creates a note game entry for testing and returns the entry ID
func CreateTestNoteGameEntry(t *testing.T, params CreateTestNoteGameEntryParams) int64 {
	t.Helper()
	SetupTestDB(t)

	timeLength, err := parseTimeLength(params.TimeLength)
	if err != nil {
		t.Fatalf("Failed to parse time length %q: %v", params.TimeLength, err)
	}

	createParams := generated.CreateNoteGameEntryParams{
		UserID:           int32(params.UserID),
		TimeLength:       timeLength,
		TotalQuestions:   int32(params.TotalQuestions),
		CorrectQuestions: int32(params.CorrectQuestions),
		NotesPerMinute:   int32(params.NotesPerMinute),
	}

	entryID, err := database.Queries.CreateNoteGameEntry(context.Background(), createParams)
	if err != nil {
		t.Fatalf("Failed to create test note game entry: %v", err)
	}

	// Register cleanup
	t.Cleanup(func() {
		DeleteTestNoteGameEntry(t, int64(entryID))
	})

	return int64(entryID)
}

// CreateTestNoteGameEntryWithDefaults creates a note game entry with sensible defaults
func CreateTestNoteGameEntryWithDefaults(t *testing.T, userID int) int64 {
	t.Helper()
	return CreateTestNoteGameEntry(t, CreateTestNoteGameEntryParams{
		UserID:           userID,
		TimeLength:       "00:05:00",
		TotalQuestions:   20,
		CorrectQuestions: 15,
		NotesPerMinute:   3.0,
	})
}

// DeleteTestNoteGameEntry removes a test note game entry from the database
func DeleteTestNoteGameEntry(t *testing.T, entryID int64) {
	t.Helper()
	if database.DBConn == nil {
		return
	}

	_, err := database.DBConn.Exec("delete from tremolo.note_game_entries where id = $1", entryID)
	if err != nil {
		t.Logf("Warning: Failed to delete test entry %d: %v", entryID, err)
	}
}

// CreateTeacherStudentAssociation creates an association between a teacher and student
func CreateTeacherStudentAssociation(t *testing.T, teacherID, studentID int) {
	t.Helper()
	SetupTestDB(t)

	err := database.Queries.CreateTeacherStudentAssociation(context.Background(), generated.CreateTeacherStudentAssociationParams{
		TeacherID: int32(teacherID),
		StudentID: int32(studentID),
	})
	if err != nil {
		t.Fatalf("Failed to create teacher-student association: %v", err)
	}

	t.Cleanup(func() {
		_, _ = database.DBConn.Exec(
			"delete from tremolo.teacher_student where teacher_id = $1 and student_id = $2",
			teacherID, studentID,
		)
	})
}

// LockTestUserAccount locks a test user's account
func LockTestUserAccount(t *testing.T, email string, duration time.Duration) {
	t.Helper()
	SetupTestDB(t)

	lockedUntil := time.Now().Add(duration)
	err := database.Queries.LockAccount(context.Background(), generated.LockAccountParams{
		Email:       sql.NullString{String: email, Valid: true},
		LockedUntil: sql.NullTime{Time: lockedUntil, Valid: true},
	})
	if err != nil {
		t.Fatalf("Failed to lock test user account: %v", err)
	}
}

// GetTestUserByEmail retrieves a test user by email
func GetTestUserByEmail(t *testing.T, email string) *generated.GetUserByEmailRow {
	t.Helper()
	SetupTestDB(t)

	user, err := database.Queries.GetUserByEmail(context.Background(), sql.NullString{String: email, Valid: true})
	if err != nil {
		if err == sql.ErrNoRows {
			return nil
		}
		t.Fatalf("Failed to get test user by email: %v", err)
	}
	return &user
}

// UniqueEmail generates a unique email for testing
func UniqueEmail(t *testing.T, prefix string) string {
	t.Helper()
	return fmt.Sprintf("%s_%d@test.com", prefix, time.Now().UnixNano())
}
