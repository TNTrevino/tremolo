package tests

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/controllers"
	"sight-reading/middleware"
	"sight-reading/tests/testutil"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// authTestRouter builds a router with only the auth routes registered,
// mirroring how main.go wires controllers.SetupAuthRoutes.
func authTestRouter() *gin.Engine {
	router := gin.New()
	controllers.SetupAuthRoutes(router)
	return router
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

// TestGetCurrentUser_NoUserIDInContext exercises controllers.GetCurrentUser's
// own defensive fallback when middleware.GetAuthenticatedUserID can't find a
// userID in the gin context. In production AuthMiddleware always runs first
// and guarantees this, so it isn't reachable through the router -- this
// calls the handler directly, the way it was tested pre-refactor.
func TestGetCurrentUser_NoUserIDInContext(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	c, w := testutil.CreateGinContext(http.MethodGet, "/")

	// Do not set userID in context

	controllers.GetCurrentUser(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Unauthorized", response["error"])
}

// TestGetCurrentUser_InvalidUserIDType is the same defensive-fallback case
// as above, for a context value of the wrong type.
func TestGetCurrentUser_InvalidUserIDType(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	c, w := testutil.CreateGinContext(http.MethodGet, "/")

	// Set userID with wrong type
	c.Set("userID", "not-an-int")

	controllers.GetCurrentUser(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Unauthorized", response["error"])
}
