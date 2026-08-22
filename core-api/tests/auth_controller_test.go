package tests

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/middleware"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// authTestRouter builds a router with only the auth routes registered,
// mirroring how NewServer wires controllers.RegisterAuthRoutes.
func authTestRouter() *http.ServeMux {
	mux := http.NewServeMux()
	controllers.RegisterAuthRoutes(mux, database.Queries)
	return mux
}

// ---------- POST /api/auth/login ----------

func TestLoginRoute_InvalidRequestBody(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := authTestRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Invalid request body", response["error"])
}

func TestLoginRoute_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "login_route_success")
	password := "TestPass123!"
	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})

	router := authTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/auth/login", "", dtos.LoginRequest{
		Email:    email,
		Password: password,
	}))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var response dtos.LoginResponse
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, email, response.User.Email)
	assert.NotEmpty(t, response.AccessToken)
	assert.NotEmpty(t, response.RefreshToken)
}

// ---------- POST /api/auth/register ----------

func TestRegisterRoute_InvalidRequestBody(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := authTestRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Invalid request body", response["error"])
}

func TestRegisterRoute_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "register_route_success")

	router := authTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/auth/register", "", dtos.RegisterRequest{
		Email:     email,
		Password:  "TestPass123!",
		FirstName: "John",
		LastName:  "Doe",
		Role:      "STUDENT",
	}))

	assert.Equal(t, http.StatusCreated, w.Code, "Response body: %s", w.Body.String())

	var response dtos.RegisterResponse
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, email, response.User.Email)
	t.Cleanup(func() { testutil.DeleteTestUser(t, response.User.ID) })
}

// ---------- POST /api/auth/refresh ----------

func TestRefreshTokenRoute_InvalidRequestBody(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := authTestRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/auth/refresh", bytes.NewBufferString("invalid json"))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Refresh token is required", response["error"])
}

func TestRefreshTokenRoute_MissingToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := authTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/auth/refresh", "", map[string]string{}))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Refresh token is required", response["error"])
}

func TestRefreshTokenRoute_EmptyToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := authTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/auth/refresh", "", map[string]string{
		"refresh_token": "",
	}))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Refresh token is required", response["error"])
}

func TestRefreshTokenRoute_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "refresh_route_success")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	refreshToken, err := middleware.GenerateRefreshToken(userID)
	require.NoError(t, err, "Failed to generate refresh token")

	router := authTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/auth/refresh", "", map[string]string{
		"refresh_token": refreshToken,
	}))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	accessToken, ok := response["access_token"].(string)
	assert.True(t, ok, "Expected access_token field in response")
	assert.NotEmpty(t, accessToken)
}

// ---------- GET /api/auth/me ----------

func TestGetCurrentUserRoute_Unauthenticated(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := authTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/auth/me", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Unauthorized", response["error"])
}

func TestGetCurrentUserRoute_ValidToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "get_user_route_valid")
	userID := testutil.CreateTestUserWithDefaults(t, email, "TEACHER")
	token := testAccessToken(t, userID)

	router := authTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/auth/me", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var response dtos.UserResponse
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, userID, response.ID)
	assert.Equal(t, email, response.Email)
}

// Note: the pre-refactor suite also had
// TestGetCurrentUser_NoUserIDInContext and
// TestGetCurrentUser_InvalidUserIDType, exercising the handler's
// defensive "no/invalid userID in context" fallback by building a
// *gin.Context directly and calling the exported gin handler function.
// That is not expressible at the HTTP level any more: the handler is now
// an unexported closure only reachable through RegisterAuthRoutes, and
// every path to it (GET /api/auth/me) is wrapped in
// middleware.RequireAuth, which never calls through without a valid int
// userID in the context. The scenario was already unreachable via the
// router pre-refactor (see the original tests' own comments); now it is
// unreachable full stop, so there is no HTTP-level request that can
// exercise it. See the final report for this note instead of silently
// dropping the coverage.

// ---------- Auth requirement of each route ----------

func TestAuthRoutes_AuthRequirement(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := authTestRouter()

	publicRoutes := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/api/auth/login"},
		{http.MethodPost, "/api/auth/register"},
		{http.MethodPost, "/api/auth/refresh"},
		{http.MethodPost, "/api/auth/google/callback"},
	}
	for _, rt := range publicRoutes {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, bearerRequest(t, rt.method, rt.path, "", map[string]string{}))
		assert.NotEqual(t, http.StatusUnauthorized, w.Code,
			"%s %s should not require auth, got 401: %s", rt.method, rt.path, w.Body.String())
	}

	protectedRoutes := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/api/auth/me"},
		{http.MethodPost, "/api/auth/google/link"},
	}
	for _, rt := range protectedRoutes {
		w := httptest.NewRecorder()
		router.ServeHTTP(w, bearerRequest(t, rt.method, rt.path, "", map[string]string{}))
		assert.Equal(t, http.StatusUnauthorized, w.Code,
			"%s %s should require auth: %s", rt.method, rt.path, w.Body.String())

		var response map[string]any
		testutil.ParseJSONResponse(t, w, &response)
		assert.Equal(t, "Unauthorized", response["error"])
	}
}
