package tests

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/middleware"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/gin-gonic/gin"
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

	reqBody := dtos.LoginRequest{
		Email:    email,
		Password: password,
	}
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.Login(c)

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var response dtos.LoginResponse
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, email, response.User.Email)
	assert.NotEmpty(t, response.AccessToken, "Expected access token to be non-empty")
	assert.NotEmpty(t, response.RefreshToken, "Expected refresh token to be non-empty")
	assert.Equal(t, "Test", response.User.FirstName)
	assert.Equal(t, "User", response.User.LastName)
	assert.Equal(t, "STUDENT", response.User.Role)
}

func TestLogin_InvalidPassword(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "login_invalid_pw")

	testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	reqBody := dtos.LoginRequest{
		Email:    email,
		Password: "WrongPassword123!",
	}
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.Login(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "Invalid credentials", response["error"])
}

func TestLogin_UserNotFound(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	reqBody := dtos.LoginRequest{
		Email:    "nonexistent_user_12345@test.com",
		Password: "TestPass123!",
	}
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.Login(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "Invalid credentials", response["error"])
}

func TestLogin_AccountLocked(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "login_locked")

	testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	testutil.LockTestUserAccount(t, email, 15*time.Minute)

	reqBody := dtos.LoginRequest{
		Email:    email,
		Password: "TestPass123!",
	}
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.Login(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	errMsg, ok := response["error"].(string)
	require.True(t, ok, "Expected error field in response")
	assert.NotEmpty(t, errMsg, "Expected error message for locked account")
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
		tc := tc // capture range variable
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", tc.reqBody)

			services.Login(c)

			assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

			var response map[string]interface{}
			testutil.ParseJSONResponse(t, w, &response)

			errMsg, ok := response["error"].(string)
			require.True(t, ok, "Expected error field in response")
			assert.Contains(t, errMsg, tc.expectedError)
		})
	}
}

func TestLogin_InvalidRequestBody(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer([]byte("invalid json")))
	c.Request.Header.Set("Content-Type", "application/json")

	services.Login(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "Invalid request body", response["error"])
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
	uppercaseEmail := "TEST" + email[4:] // Make part of email uppercase
	reqBody := dtos.LoginRequest{
		Email:    uppercaseEmail,
		Password: password,
	}
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.Login(c)

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())
}

func TestRegister_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "register_success")

	reqBody := dtos.RegisterRequest{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "John",
		LastName:  "Doe",
		Role:      "STUDENT",
	}
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.Register(c)

	assert.Equal(t, http.StatusCreated, w.Code, "Response body: %s", w.Body.String())

	var response dtos.RegisterResponse
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "User created successfully", response.Message)
	assert.Equal(t, email, response.User.Email)
	assert.Equal(t, "John", response.User.FirstName)
	assert.Equal(t, "Doe", response.User.LastName)
	assert.Equal(t, "STUDENT", response.User.Role)
	assert.NotZero(t, response.User.ID, "Expected user ID to be non-zero")

	// Cleanup: delete the created user
	t.Cleanup(func() {
		testutil.DeleteTestUser(t, response.User.ID)
	})
}

func TestRegister_DuplicateEmail(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "register_dup")

	// Create first user
	testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Try to register with same email
	reqBody := dtos.RegisterRequest{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "Jane",
		LastName:  "Doe",
		Role:      "STUDENT",
	}
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.Register(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "Email already exists", response["error"])
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
		tc := tc // capture range variable
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", tc.reqBody)

			services.Register(c)

			assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

			var response map[string]interface{}
			testutil.ParseJSONResponse(t, w, &response)

			errMsg, ok := response["error"].(string)
			require.True(t, ok, "Expected error field in response")
			assert.Contains(t, errMsg, tc.expectedError)
		})
	}
}

func TestRegister_InvalidRequestBody(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer([]byte("invalid json")))
	c.Request.Header.Set("Content-Type", "application/json")

	services.Register(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "Invalid request body", response["error"])
}

func TestRegister_AllRoles(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	roles := []string{"STUDENT", "TEACHER", "PARENT"}

	for _, role := range roles {
		role := role // capture range variable
		t.Run("Role_"+role, func(t *testing.T) {
			t.Parallel()

			email := testutil.UniqueEmail(t, "register_role_"+role)

			reqBody := dtos.RegisterRequest{
				Email:     email,
				Password:  "TestPass123!",
				FirstName: "Test",
				LastName:  "User",
				Role:      role,
			}
			c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

			services.Register(c)

			assert.Equal(t, http.StatusCreated, w.Code, "Response body for role %s: %s", role, w.Body.String())

			var response dtos.RegisterResponse
			testutil.ParseJSONResponse(t, w, &response)

			assert.Equal(t, role, response.User.Role)

			// Cleanup
			t.Cleanup(func() {
				testutil.DeleteTestUser(t, response.User.ID)
			})
		})
	}
}

func TestGetCurrentUser_ValidToken(t *testing.T) {
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

	c, w := testutil.CreateGinContextWithUserID(http.MethodGet, "/", userID)

	services.GetCurrentUser(c)

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var response dtos.UserResponse
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, userID, response.ID)
	assert.Equal(t, email, response.Email)
	assert.Equal(t, "Current", response.FirstName)
	assert.Equal(t, "User", response.LastName)
	assert.Equal(t, "TEACHER", response.Role)
}

func TestGetCurrentUser_NoUserIDInContext(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	c, w := testutil.CreateGinContext(http.MethodGet, "/")

	// Do not set userID in context

	services.GetCurrentUser(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "Unauthorized", response["error"])
}

func TestGetCurrentUser_InvalidUserIDType(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	c, w := testutil.CreateGinContext(http.MethodGet, "/")

	// Set userID with wrong type
	c.Set("userID", "not-an-int")

	services.GetCurrentUser(c)

	assert.Equal(t, http.StatusInternalServerError, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "Internal server error", response["error"])
}

func TestGetCurrentUser_UserNotFound(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	c, w := testutil.CreateGinContextWithUserID(http.MethodGet, "/", 99999999)

	services.GetCurrentUser(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "Unauthorized", response["error"])
}

func TestRefreshToken_Valid(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "refresh_valid")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Generate a valid refresh token
	refreshToken, err := middleware.GenerateRefreshToken(userID)
	require.NoError(t, err, "Failed to generate refresh token")

	reqBody := map[string]string{
		"refresh_token": refreshToken,
	}
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.RefreshToken(c)

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	accessToken, ok := response["access_token"].(string)
	require.True(t, ok, "Expected access_token field in response")
	assert.NotEmpty(t, accessToken, "Expected non-empty access_token in response")
}

func TestRefreshToken_Invalid(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	reqBody := map[string]string{
		"refresh_token": "invalid.token.here",
	}
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.RefreshToken(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "Invalid refresh token", response["error"])
}

func TestRefreshToken_MissingToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	reqBody := map[string]string{}
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.RefreshToken(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "Refresh token is required", response["error"])
}

func TestRefreshToken_AccessTokenAsRefresh(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "refresh_access_as_refresh")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Generate an access token (not a refresh token)
	accessToken, err := middleware.GenerateAccessToken(userID)
	require.NoError(t, err, "Failed to generate access token")

	reqBody := map[string]string{
		"refresh_token": accessToken,
	}
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.RefreshToken(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]interface{}
	testutil.ParseJSONResponse(t, w, &response)

	assert.Equal(t, "Invalid token type", response["error"])
}

func TestRefreshToken_InvalidRequestBody(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/", bytes.NewBuffer([]byte("invalid json")))
	c.Request.Header.Set("Content-Type", "application/json")

	services.RefreshToken(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())
}

func TestRefreshToken_EmptyToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	reqBody := map[string]string{
		"refresh_token": "",
	}
	c, w := testutil.CreateGinContextWithBody(http.MethodPost, "/", reqBody)

	services.RefreshToken(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())
}
