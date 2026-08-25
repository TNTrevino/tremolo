// Package testutil provides test utilities for database setup and test data creation
package testutil

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"

	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/services"
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
		initTestLogger()
		database.InitializeDBConnection()
		database.RunMigrations(database.DBConn)
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

// testPasswordHashes memoizes one bcrypt hash per distinct password so
// the suite pays for each string once, at bcrypt.MinCost. These hashes
// protect nothing; they only need to verify. At the production cost of
// 12, hashing alone puts the tests package past go test's 10-minute
// timeout under CI's -race and coverage run.
var (
	testPasswordHashesMu sync.Mutex
	testPasswordHashes   = map[string]string{}
)

func hashTestPassword(t *testing.T, password string) string {
	t.Helper()
	testPasswordHashesMu.Lock()
	defer testPasswordHashesMu.Unlock()

	if hash, ok := testPasswordHashes[password]; ok {
		return hash
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		t.Fatalf("Failed to hash password: %v", err)
	}
	testPasswordHashes[password] = string(hashed)
	return testPasswordHashes[password]
}

// CreateTestUser creates a user in the database for testing and returns the user ID.
// The password is hashed before storing.
func CreateTestUser(t *testing.T, params CreateTestUserParams) int {
	t.Helper()
	SetupTestDB(t)

	hashedPassword := hashTestPassword(t, params.Password)

	roleID, err := database.Queries.GetRoleIDByName(context.Background(), params.Role)
	if err != nil {
		t.Fatalf("Failed to resolve role %q: %v", params.Role, err)
	}

	createParams := generated.CreateUserParams{
		FirstName: params.FirstName,
		LastName:  params.LastName,
		Email:     sql.NullString{String: params.Email, Valid: true},
		Password:  sql.NullString{String: hashedPassword, Valid: true},
		RoleID:    roleID,
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
		// Queue rows key on the address string rather than a user id, so
		// there is no foreign key and nothing cascades from the user.
		DeleteQueuedEmails(t, params.Email)
		DeleteTestUser(t, int(createdUser.ID))
	})

	if err := services.CreateDefaultKeyboardBindings(context.Background(), database.Queries, int(createdUser.ID)); err != nil {
		t.Fatalf("failed to seed default keyboard bindings for test user %d: %v", createdUser.ID, err)
	}

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
	if database.Queries == nil {
		return
	}

	ctx := context.Background()

	// First delete related note game entries
	err := database.Queries.DeleteNoteGameEntriesByUserID(ctx, int32(userID))
	if err != nil {
		t.Logf("Warning: Failed to delete note game entries for user %d: %v", userID, err)
	}

	// Delete keyboard bindings
	err = database.Queries.DeleteKeyboardBindings(ctx, int32(userID))
	if err != nil {
		t.Logf("Warning: Failed to delete keyboard bindings for user %d: %v", userID, err)
	}

	// Delete teacher-student associations where user is teacher
	err = database.Queries.DeleteAllTeacherStudentsByTeacher(ctx, int32(userID))
	if err != nil {
		t.Logf("Warning: Failed to delete teacher-student associations (as teacher) for user %d: %v", userID, err)
	}

	// Delete teacher-student associations where user is student
	err = database.Queries.DeleteAllTeacherStudentsByStudent(ctx, int32(userID))
	if err != nil {
		t.Logf("Warning: Failed to delete teacher-student associations (as student) for user %d: %v", userID, err)
	}

	// Delete the user
	err = database.Queries.DeleteUserByID(ctx, int32(userID))
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
	GameType         string // defaults to "note"
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

	gameType := params.GameType
	if gameType == "" {
		gameType = "note"
	}

	createParams := generated.CreateNoteGameEntryParams{
		UserID:           int32(params.UserID),
		TimeLength:       timeLength,
		TotalQuestions:   int32(params.TotalQuestions),
		CorrectQuestions: int32(params.CorrectQuestions),
		NotesPerMinute:   int32(params.NotesPerMinute),
		GameType:         gameType,
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
	if database.Queries == nil {
		return
	}

	err := database.Queries.DeleteNoteGameEntryByID(context.Background(), int32(entryID))
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
		_ = database.Queries.DeleteTeacherStudentRelationship(context.Background(), generated.DeleteTeacherStudentRelationshipParams{
			TeacherID: int32(teacherID),
			StudentID: int32(studentID),
		})
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
		if errors.Is(err, sql.ErrNoRows) {
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

// GetTestUserGradeLevel reads a user's grade_level column directly. It
// exists because GetUserByEmail does not select that column -- the only
// thing a test needs from it is proving what CreateUser actually
// persisted (#244), which doesn't warrant widening a query every other
// caller of GetUserByEmail would then also get back. An invalid
// (NULL) result means the column is unset.
func GetTestUserGradeLevel(t *testing.T, email string) sql.NullString {
	t.Helper()
	SetupTestDB(t)

	var gradeLevel sql.NullString
	err := database.DBConn.QueryRowContext(context.Background(),
		"select grade_level from tremolo.users where email = $1", email,
	).Scan(&gradeLevel)
	if err != nil {
		t.Fatalf("Failed to read grade_level for %q: %v", email, err)
	}
	return gradeLevel
}

// ---------------------------------------------------------------------------
// Email queue helpers
// ---------------------------------------------------------------------------

// QueuedEmailsFor returns every queued email for one recipient, newest
// first.
func QueuedEmailsFor(t *testing.T, recipient string) []generated.TremoloQueuedEmail {
	t.Helper()
	SetupTestDB(t)

	rows, err := database.Queries.ListQueuedEmailsByRecipient(context.Background(), recipient)
	if err != nil {
		t.Fatalf("Failed to list queued emails for %s: %v", recipient, err)
	}
	return rows
}

// LatestQueuedEmail returns the most recently queued email for a
// recipient, or nil when there is none.
//
// It picks the highest id rather than trusting the created_at ordering:
// two rows inserted in the same instant would otherwise come back in an
// unspecified order.
func LatestQueuedEmail(t *testing.T, recipient string) *generated.TremoloQueuedEmail {
	t.Helper()

	rows := QueuedEmailsFor(t, recipient)
	if len(rows) == 0 {
		return nil
	}

	latest := rows[0]
	for _, row := range rows[1:] {
		if row.ID > latest.ID {
			latest = row
		}
	}
	return &latest
}

// EmailSendAttempts returns the attempt log for one queued email, oldest
// first.
func EmailSendAttempts(t *testing.T, queuedEmailID int64) []generated.TremoloEmailSendAttempt {
	t.Helper()
	SetupTestDB(t)

	rows, err := database.Queries.ListEmailSendAttempts(context.Background(), queuedEmailID)
	if err != nil {
		t.Fatalf("Failed to list send attempts for queued email %d: %v", queuedEmailID, err)
	}
	return rows
}

// DeleteQueuedEmails removes every queued email for one recipient. The
// attempt rows cascade.
func DeleteQueuedEmails(t *testing.T, recipient string) {
	t.Helper()
	if database.Queries == nil || recipient == "" {
		return
	}

	if err := database.Queries.DeleteQueuedEmailsByRecipient(context.Background(), recipient); err != nil {
		t.Logf("Warning: Failed to delete queued emails for %s: %v", recipient, err)
	}
}

// EnqueueTestEmail inserts one pending queue row for a recipient with the
// production default of five attempts.
func EnqueueTestEmail(t *testing.T, recipient string) generated.TremoloQueuedEmail {
	t.Helper()
	return EnqueueTestEmailWithMaxAttempts(t, recipient, 5)
}

// EnqueueTestEmailWithMaxAttempts inserts one pending queue row whose
// retry budget the caller chooses, which is how a test reaches the dead
// state without sending five times.
func EnqueueTestEmailWithMaxAttempts(t *testing.T, recipient string, maxAttempts int32) generated.TremoloQueuedEmail {
	t.Helper()
	SetupTestDB(t)

	row, err := database.Queries.EnqueueEmail(context.Background(), generated.EnqueueEmailParams{
		Recipient:     recipient,
		RecipientName: "Test Recipient",
		Subject:       "Test message",
		Template:      "password-reset",
		BodyHtml:      "<html><body>test</body></html>",
		BodyText:      "test",
		// message_id is UNIQUE, so every row needs its own.
		MessageID:   fmt.Sprintf("test-%d@test.com", time.Now().UnixNano()),
		MaxAttempts: maxAttempts,
	})
	if err != nil {
		t.Fatalf("Failed to enqueue test email for %s: %v", recipient, err)
	}

	t.Cleanup(func() {
		DeleteQueuedEmails(t, recipient)
	})

	return row
}

// ClearQueuedEmails empties the whole queue.
//
// The watcher's claim query is global by design — it claims whatever is
// claimable, which is the point — so a watcher test has to start from an
// empty queue to be able to assert on counts. Every email test runs
// without t.Parallel for the same reason.
func ClearQueuedEmails(t *testing.T) {
	t.Helper()
	SetupTestDB(t)

	if _, err := database.DBConn.ExecContext(context.Background(), "delete from tremolo.queued_emails"); err != nil {
		t.Fatalf("Failed to clear the email queue: %v", err)
	}
}

// ---------------------------------------------------------------------------
// Password reset helpers
// ---------------------------------------------------------------------------

// CreateTestOAuthUser creates a Google-linked user with no password set
// (password NULL, google_id present) and returns the user ID. It mirrors
// createOAuthTestUser in tests/google_auth_test.go; this copy lives in
// testutil because password reset's Google-only-account tests are not the
// only callers that need one.
func CreateTestOAuthUser(t *testing.T, email string) int {
	t.Helper()
	SetupTestDB(t)

	roleID, err := database.Queries.GetRoleIDByName(context.Background(), "BASIC")
	if err != nil {
		t.Fatalf("Failed to resolve BASIC role: %v", err)
	}

	row, err := database.Queries.CreateOAuthUser(context.Background(), generated.CreateOAuthUserParams{
		FirstName: "Test",
		LastName:  "OAuthUser",
		Email:     sql.NullString{String: email, Valid: true},
		GoogleID:  sql.NullString{String: "test-google-" + email, Valid: true},
		RoleID:    roleID,
		SchoolID:  sql.NullInt32{Valid: false},
	})
	if err != nil {
		t.Fatalf("Failed to create test OAuth user: %v", err)
	}

	uid := int(row.ID)
	t.Cleanup(func() {
		DeleteQueuedEmails(t, email)
		DeleteTestUser(t, uid)
	})

	if err := services.CreateDefaultKeyboardBindings(context.Background(), database.Queries, uid); err != nil {
		t.Fatalf("failed to seed default keyboard bindings for test OAuth user %d: %v", uid, err)
	}

	return uid
}

// CreatePasswordResetToken inserts one password reset token row directly
// (bypassing services.RequestPasswordReset) and returns the plaintext
// token. This is the only way a test can mint an already-expired token, or
// pin a token to a caller-chosen TTL -- a live request through the service
// always uses services.PasswordResetTokenTTL and can't produce either.
//
// Token minting goes through services.NewResetToken, the same algorithm a
// real request uses, rather than a second hand-rolled copy of it.
func CreatePasswordResetToken(t *testing.T, userID int, ttl time.Duration) string {
	t.Helper()
	SetupTestDB(t)

	token, hash, err := services.NewResetToken()
	if err != nil {
		t.Fatalf("Failed to generate a test reset token: %v", err)
	}

	if err := database.Queries.CreatePasswordResetToken(context.Background(), generated.CreatePasswordResetTokenParams{
		UserID:    int32(userID),
		TokenHash: hash,
		ExpiresAt: time.Now().Add(ttl),
	}); err != nil {
		t.Fatalf("Failed to create test password reset token: %v", err)
	}

	return token
}

// PasswordResetTokensFor returns every password reset token row for one
// user.
func PasswordResetTokensFor(t *testing.T, userID int) []generated.TremoloPasswordResetToken {
	t.Helper()
	SetupTestDB(t)

	rows, err := database.Queries.ListPasswordResetTokensByUser(context.Background(), int32(userID))
	if err != nil {
		t.Fatalf("Failed to list password reset tokens for user %d: %v", userID, err)
	}
	return rows
}
