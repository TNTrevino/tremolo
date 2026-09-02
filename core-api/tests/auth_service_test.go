package tests

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/middleware"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLogin_ValidCredentials(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "login_valid")
	password := "TestPass123!"

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})

	result, err := services.Login(context.Background(), database.Queries, dtos.LoginRequest{
		Email:    email,
		Password: password,
	})

	require.NoError(t, err)
	require.NotNil(t, result)

	assert.Equal(t, email, result.User.Email)
	assert.NotEmpty(t, result.AccessToken, "Expected access token to be non-empty")
	assert.NotEmpty(t, result.RefreshToken, "Expected refresh token to be non-empty")
	assert.Equal(t, "Test", result.User.FirstName)
	assert.Equal(t, "User", result.User.LastName)
	assert.Equal(t, "STUDENT", result.User.Role)
}

func TestLogin_InvalidPassword(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "login_invalid_pw")

	testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	result, err := services.Login(context.Background(), database.Queries, dtos.LoginRequest{
		Email:    email,
		Password: "WrongPassword123!",
	})

	require.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, services.ErrInvalidCredentials))
}

func TestLogin_UserNotFound(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	result, err := services.Login(context.Background(), database.Queries, dtos.LoginRequest{
		Email:    "nonexistent_user_12345@test.com",
		Password: "TestPass123!",
	})

	require.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, services.ErrInvalidCredentials))
}

func TestLogin_AccountLocked(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "login_locked")

	testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	testutil.LockTestUserAccount(t, email, 15*time.Minute)

	result, err := services.Login(context.Background(), database.Queries, dtos.LoginRequest{
		Email:    email,
		Password: "TestPass123!",
	})

	require.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, services.ErrAccountLocked))
}

// TestLogin_LockoutTriggered exercises the failed-attempt counting all
// the way to the threshold: the attempt that crosses MaxLoginAttempts
// must lock the account and report it via LockoutTriggeredError (not
// the generic ErrInvalidCredentials the prior attempts return), and a
// subsequent attempt -- even with the correct password -- must then see
// the account as locked.
func TestLogin_LockoutTriggered(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "login_lockout_trigger")
	password := "TestPass123!"
	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})

	var lastErr error
	for range services.MaxLoginAttempts {
		_, lastErr = services.Login(context.Background(), database.Queries, dtos.LoginRequest{
			Email:    email,
			Password: "WrongPassword123!",
		})
		require.Error(t, lastErr)
	}

	var lockoutErr *services.LockoutTriggeredError
	require.True(t, errors.As(lastErr, &lockoutErr),
		"expected the attempt crossing MaxLoginAttempts to return *LockoutTriggeredError, got: %v", lastErr)
	assert.Greater(t, lockoutErr.Duration, time.Duration(0))

	// A subsequent attempt with the CORRECT password is still rejected,
	// because the account is now locked.
	result, err := services.Login(context.Background(), database.Queries, dtos.LoginRequest{
		Email:    email,
		Password: password,
	})
	require.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, services.ErrAccountLocked))
}

func TestLogin_EmailNormalization(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "login_normalize")
	password := "TestPass123!"

	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})

	// Login with uppercase email
	result, err := services.Login(context.Background(), database.Queries, dtos.LoginRequest{
		Email:    strings.ToUpper(email),
		Password: password,
	})

	require.NoError(t, err)
	require.NotNil(t, result)
}

// TestLogin_UnverifiedAccount_SucceedsByDefault is #108's SOFT policy:
// REQUIRE_EMAIL_VERIFICATION is unset in the test environment, so an
// unverified account still signs in -- only a banner nudges it, and that
// is frontend-side.
func TestLogin_UnverifiedAccount_SucceedsByDefault(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "login_unverified_default")
	password := "TestPass123!"
	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})

	result, err := services.Login(context.Background(), database.Queries, dtos.LoginRequest{
		Email:    email,
		Password: password,
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.False(t, result.User.EmailVerified)
}

// TestLogin_UnverifiedAccount_IsRejectedWhenVerificationIsRequired uses
// t.Setenv, which panics if this test (or another still running
// concurrently with it) calls t.Parallel -- so this one runs serially.
func TestLogin_UnverifiedAccount_IsRejectedWhenVerificationIsRequired(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Setenv("REQUIRE_EMAIL_VERIFICATION", "true")

	email := testutil.UniqueEmail(t, "login_unverified_required")
	password := "TestPass123!"
	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})

	result, err := services.Login(context.Background(), database.Queries, dtos.LoginRequest{
		Email:    email,
		Password: password,
	})

	require.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, services.ErrEmailNotVerified))
}

func TestRegister_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "register_success")

	result, err := services.Register(context.Background(), database.Queries, dtos.RegisterRequest{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "John",
		LastName:  "Doe",
		Role:      "STUDENT",
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	t.Cleanup(func() { testutil.DeleteTestUser(t, result.User.ID) })

	assert.Equal(t, "User created successfully", result.Message)
	assert.Equal(t, email, result.User.Email)
	assert.Equal(t, "John", result.User.FirstName)
	assert.Equal(t, "Doe", result.User.LastName)
	assert.Equal(t, "STUDENT", result.User.Role)
	assert.NotZero(t, result.User.ID, "Expected user ID to be non-zero")
}

func TestRegister_TrimsNames(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "register_trim")

	// min=2 length validation passes with the padding intact, so a padded
	// name reaches the insert. It must be trimmed before persisting.
	result, err := services.Register(context.Background(), database.Queries, dtos.RegisterRequest{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "  John  ",
		LastName:  "  Doe  ",
		Role:      "STUDENT",
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	t.Cleanup(func() { testutil.DeleteTestUser(t, result.User.ID) })

	assert.Equal(t, "John", result.User.FirstName, "leading/trailing whitespace must be trimmed")
	assert.Equal(t, "Doe", result.User.LastName)

	// Cross-check the persisted row, not just the echoed response.
	stored := testutil.GetTestUserByEmail(t, email)
	require.NotNil(t, stored)
	assert.Equal(t, "John", stored.FirstName)
	assert.Equal(t, "Doe", stored.LastName)
}

func TestRegister_DuplicateEmail(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "register_dup")

	// Create first user
	testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Try to register with same email
	result, err := services.Register(context.Background(), database.Queries, dtos.RegisterRequest{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "Jane",
		LastName:  "Doe",
		Role:      "STUDENT",
	})

	require.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, services.ErrEmailTaken))
}

func TestRegister_AllRoles(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	roles := []string{"STUDENT", "TEACHER"}

	for _, role := range roles {
		t.Run("Role_"+role, func(t *testing.T) {
			t.Parallel()

			email := testutil.UniqueEmail(t, "register_role_"+role)

			// A TEACHER signup must redeem an invite code (#250); a
			// student never sends one. See tests/teacher_invite_service_test.go
			// for the gate itself.
			inviteCode := ""
			if role == "TEACHER" {
				inviteCode = testutil.CreateTestTeacherInviteCode(t, testutil.CreateTestTeacherInviteCodeParams{})
			}

			result, err := services.Register(context.Background(), database.Queries, dtos.RegisterRequest{
				Email:      email,
				Password:   "TestPass123!",
				FirstName:  "Test",
				LastName:   "User",
				Role:       role,
				InviteCode: inviteCode,
			})

			require.NoError(t, err, "Response for role %s", role)
			require.NotNil(t, result)
			t.Cleanup(func() { testutil.DeleteTestUser(t, result.User.ID) })

			assert.Equal(t, role, result.User.Role)
		})
	}
}

// TestRegister_GradeLevel pins storage, not just validation (#244): a
// supplied grade is stored as sent, and an absent one reads back as a SQL
// NULL rather than an empty string -- "declined to say" and "created
// before we asked" must not be distinguishable in the data.
func TestRegister_GradeLevel(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	t.Run("stores the supplied grade", func(t *testing.T) {
		t.Parallel()

		email := testutil.UniqueEmail(t, "register_grade_set")
		result, err := services.Register(context.Background(), database.Queries, dtos.RegisterRequest{
			Email:      email,
			Password:   "TestPass123!",
			FirstName:  "Test",
			LastName:   "User",
			Role:       "STUDENT",
			GradeLevel: "8",
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		t.Cleanup(func() { testutil.DeleteTestUser(t, result.User.ID) })

		stored := testutil.GetTestUserGradeLevel(t, email)
		require.True(t, stored.Valid, "expected grade_level to be set, got NULL")
		assert.Equal(t, "8", stored.String)
	})

	t.Run("an absent grade stores NULL, not an empty string", func(t *testing.T) {
		t.Parallel()

		email := testutil.UniqueEmail(t, "register_grade_absent")
		result, err := services.Register(context.Background(), database.Queries, dtos.RegisterRequest{
			Email:     email,
			Password:  "TestPass123!",
			FirstName: "Test",
			LastName:  "User",
			Role:      "STUDENT",
		})

		require.NoError(t, err)
		require.NotNil(t, result)
		t.Cleanup(func() { testutil.DeleteTestUser(t, result.User.ID) })

		stored := testutil.GetTestUserGradeLevel(t, email)
		assert.False(t, stored.Valid, "an absent grade must read back as NULL")
	})
}

func TestGetCurrentUser_ValidUserID(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "get_user_valid")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "Current",
		LastName:  "User",
		Role:      "TEACHER",
	})

	result, err := services.GetCurrentUser(context.Background(), database.Queries, userID)

	require.NoError(t, err)
	require.NotNil(t, result)
	assert.Equal(t, userID, result.ID)
	assert.Equal(t, email, result.Email)
	assert.Equal(t, "Current", result.FirstName)
	assert.Equal(t, "User", result.LastName)
	assert.Equal(t, "TEACHER", result.Role)
}

func TestGetCurrentUser_UserNotFound(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	result, err := services.GetCurrentUser(context.Background(), database.Queries, 99999999)

	require.Error(t, err)
	assert.Nil(t, result)
	assert.True(t, errors.Is(err, services.ErrNotFound))
}

func TestRefreshToken_Valid(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "refresh_valid")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Generate a valid refresh token
	refreshToken, err := middleware.GenerateRefreshToken(userID)
	require.NoError(t, err, "Failed to generate refresh token")

	accessToken, err := services.RefreshToken(refreshToken)

	require.NoError(t, err)
	assert.NotEmpty(t, accessToken, "Expected non-empty access token")
}

func TestRefreshToken_Invalid(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	accessToken, err := services.RefreshToken("invalid.token.here")

	require.Error(t, err)
	assert.Empty(t, accessToken)
	assert.True(t, errors.Is(err, services.ErrInvalidRefreshToken))
}

// TestRegister_EnqueuesTheVerificationEmail is #108: a successful
// registration must also queue the "confirm your address" mail.
func TestRegister_EnqueuesTheVerificationEmail(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "register_verify")

	result, err := services.Register(context.Background(), database.Queries, dtos.RegisterRequest{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "John",
		LastName:  "Doe",
		Role:      "STUDENT",
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	t.Cleanup(func() { testutil.DeleteTestUser(t, result.User.ID) })

	queued := testutil.QueuedEmailsFor(t, email)
	require.Len(t, queued, 1, "expected exactly one queued email")
	assert.Equal(t, "verify-email", queued[0].Template)

	tokens := testutil.EmailTokensFor(t, result.User.ID, services.PurposeVerifyEmail)
	assert.Len(t, tokens, 1, "expected exactly one verify-email token row")
}

// enqueueEmailFailsQuerier fails EnqueueEmail and delegates everything
// else. Embedding the interface keeps the stub to the one method under
// test, mirroring roleLookupFailsQuerier in create_user_role_test.go.
type enqueueEmailFailsQuerier struct {
	generated.Querier
}

func (enqueueEmailFailsQuerier) EnqueueEmail(context.Context, generated.EnqueueEmailParams) (generated.TremoloQueuedEmail, error) {
	return generated.TremoloQueuedEmail{}, errors.New("queue insert failed")
}

// TestRegister_SucceedsWhenTheQueueInsertFails proves the "best effort"
// doc comment on Register's SendVerificationEmail call: a broken email
// queue must not turn a successful signup into a failed one.
func TestRegister_SucceedsWhenTheQueueInsertFails(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "register_queue_fails")

	result, err := services.Register(context.Background(), enqueueEmailFailsQuerier{Querier: database.Queries}, dtos.RegisterRequest{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "John",
		LastName:  "Doe",
		Role:      "STUDENT",
	})

	require.NoError(t, err)
	require.NotNil(t, result)
	t.Cleanup(func() { testutil.DeleteTestUser(t, result.User.ID) })

	assert.Equal(t, email, result.User.Email)
}

func TestRefreshToken_AccessTokenAsRefresh(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "refresh_access_as_refresh")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Generate an access token (not a refresh token)
	accessToken, err := middleware.GenerateAccessToken(userID)
	require.NoError(t, err, "Failed to generate access token")

	newAccessToken, err := services.RefreshToken(accessToken)

	require.Error(t, err)
	assert.Empty(t, newAccessToken)
	assert.True(t, errors.Is(err, services.ErrWrongTokenType))
}
