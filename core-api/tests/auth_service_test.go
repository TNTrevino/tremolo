package tests

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
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
	for i := 0; i < services.MaxLoginAttempts; i++ {
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

func TestLogin_ValidationErrors(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	testCases := []struct {
		name          string
		reqBody       dtos.LoginRequest
		expectedError string
	}{
		{
			name: "Empty email",
			reqBody: dtos.LoginRequest{
				Email:    "",
				Password: "TestPass123!",
			},
			expectedError: "Email is required",
		},
		{
			name: "Invalid email format",
			reqBody: dtos.LoginRequest{
				Email:    "invalidemail",
				Password: "TestPass123!",
			},
			expectedError: "Email must be a valid email address",
		},
		{
			name: "Empty password",
			reqBody: dtos.LoginRequest{
				Email:    "test@example.com",
				Password: "",
			},
			expectedError: "Password is required",
		},
		{
			name: "Password too short",
			reqBody: dtos.LoginRequest{
				Email:    "test@example.com",
				Password: "short",
			},
			expectedError: "Password must be at least 8 characters",
		},
		{
			name: "Password missing complexity",
			reqBody: dtos.LoginRequest{
				Email:    "test@example.com",
				Password: "simplepassword",
			},
			expectedError: "Password must contain at least 1 uppercase letter",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			result, err := services.Login(context.Background(), database.Queries, tc.reqBody)

			require.Error(t, err)
			assert.Nil(t, result)
			assert.True(t, errors.Is(err, services.ErrValidation))
			assert.Contains(t, err.Error(), tc.expectedError)
		})
	}
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

func TestRegister_ValidationErrors(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	testCases := []struct {
		name          string
		reqBody       dtos.RegisterRequest
		expectedError string
	}{
		{
			name: "Missing email",
			reqBody: dtos.RegisterRequest{
				Password:  "TestPass123!",
				FirstName: "John",
				LastName:  "Doe",
				Role:      "STUDENT",
			},
			expectedError: "Email is required",
		},
		{
			name: "Invalid email format",
			reqBody: dtos.RegisterRequest{
				Email:     "invalidemail",
				Password:  "TestPass123!",
				FirstName: "John",
				LastName:  "Doe",
				Role:      "STUDENT",
			},
			expectedError: "Email must be a valid email address",
		},
		{
			name: "Missing password",
			reqBody: dtos.RegisterRequest{
				Email:     "test@example.com",
				FirstName: "John",
				LastName:  "Doe",
				Role:      "STUDENT",
			},
			expectedError: "Password is required",
		},
		{
			name: "Password too short",
			reqBody: dtos.RegisterRequest{
				Email:     "test@example.com",
				Password:  "Short1!",
				FirstName: "John",
				LastName:  "Doe",
				Role:      "STUDENT",
			},
			expectedError: "Password must be at least 8 characters",
		},
		{
			name: "Password missing complexity",
			reqBody: dtos.RegisterRequest{
				Email:     "test@example.com",
				Password:  "simplepassword",
				FirstName: "John",
				LastName:  "Doe",
				Role:      "STUDENT",
			},
			expectedError: "Password must contain at least 1 uppercase letter",
		},
		{
			name: "Missing first name",
			reqBody: dtos.RegisterRequest{
				Email:    "test@example.com",
				Password: "TestPass123!",
				LastName: "Doe",
				Role:     "STUDENT",
			},
			expectedError: "First name is required",
		},
		{
			name: "First name too short",
			reqBody: dtos.RegisterRequest{
				Email:     "test@example.com",
				Password:  "TestPass123!",
				FirstName: "J",
				LastName:  "Doe",
				Role:      "STUDENT",
			},
			expectedError: "First name must be at least 2 characters",
		},
		{
			name: "Missing last name",
			reqBody: dtos.RegisterRequest{
				Email:     "test@example.com",
				Password:  "TestPass123!",
				FirstName: "John",
				Role:      "STUDENT",
			},
			expectedError: "Last name is required",
		},
		{
			name: "Last name too short",
			reqBody: dtos.RegisterRequest{
				Email:     "test@example.com",
				Password:  "TestPass123!",
				FirstName: "John",
				LastName:  "D",
				Role:      "STUDENT",
			},
			expectedError: "Last name must be at least 2 characters",
		},
		{
			name: "Missing role",
			reqBody: dtos.RegisterRequest{
				Email:     "test@example.com",
				Password:  "TestPass123!",
				FirstName: "John",
				LastName:  "Doe",
			},
			expectedError: "Role is required",
		},
		{
			name: "Invalid role",
			reqBody: dtos.RegisterRequest{
				Email:     "test@example.com",
				Password:  "TestPass123!",
				FirstName: "John",
				LastName:  "Doe",
				Role:      "ADMIN",
			},
			expectedError: "Role must be one of: STUDENT, TEACHER, PARENT",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			result, err := services.Register(context.Background(), database.Queries, tc.reqBody)

			require.Error(t, err)
			assert.Nil(t, result)
			assert.True(t, errors.Is(err, services.ErrValidation))
			assert.Contains(t, err.Error(), tc.expectedError)
		})
	}
}

func TestRegister_AllRoles(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	roles := []string{"STUDENT", "TEACHER", "PARENT"}

	for _, role := range roles {
		t.Run("Role_"+role, func(t *testing.T) {
			t.Parallel()

			email := testutil.UniqueEmail(t, "register_role_"+role)

			result, err := services.Register(context.Background(), database.Queries, dtos.RegisterRequest{
				Email:     email,
				Password:  "TestPass123!",
				FirstName: "Test",
				LastName:  "User",
				Role:      role,
			})

			require.NoError(t, err, "Response for role %s", role)
			require.NotNil(t, result)
			t.Cleanup(func() { testutil.DeleteTestUser(t, result.User.ID) })

			assert.Equal(t, role, result.User.Role)
		})
	}
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
