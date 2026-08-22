package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/middleware"
	"sight-reading/tests/testutil"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// adminTestRouter builds a router with only the admin routes registered,
// mirroring how main.go wires controllers.SetupAdminRoutes.
func adminTestRouter() *gin.Engine {
	router := gin.New()
	controllers.SetupAdminRoutes(router)
	return router
}

// bearerRequest builds an httptest.NewRequest with an optional JSON body
// and Authorization header.
func bearerRequest(t *testing.T, method, path, token string, body any) *http.Request {
	t.Helper()

	var req *http.Request
	if body != nil {
		jsonBody, err := json.Marshal(body)
		require.NoError(t, err)
		req = httptest.NewRequest(method, path, bytes.NewBuffer(jsonBody))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}

	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	return req
}

func testAccessToken(t *testing.T, userID int) string {
	t.Helper()
	token, err := middleware.GenerateAccessToken(userID)
	require.NoError(t, err, "failed to generate access token")
	return token
}

func testSchoolID(t *testing.T) int32 {
	t.Helper()
	schoolID, err := database.Queries.CreateSchool(context.Background(), generated.CreateSchoolParams{
		Title:   "Admin Route Test School",
		City:    "Austin",
		County:  "Travis",
		State:   "TX",
		Country: "US",
	})
	require.NoError(t, err)
	return schoolID
}

// ---------- GET /teachers ----------

func TestAdminRoutes_Unauthenticated_ReturnsUnauthorized(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := adminTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/teachers", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
}

func TestAdminRoutes_NonAdmin_ReturnsForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "admin_route_student")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := adminTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/teachers", token, nil))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Forbidden", resp["error"])
}

func TestAdminRoutes_Teacher_ReturnsForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "admin_route_teacher")
	userID := testutil.CreateTestUserWithDefaults(t, email, "TEACHER")
	token := testAccessToken(t, userID)

	router := adminTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/teachers", token, nil))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())
}

func TestAdminRoutes_Admin_ReturnsOK(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "admin_route_admin")
	userID := testutil.CreateTestUserWithDefaults(t, email, "ADMIN")
	token := testAccessToken(t, userID)

	router := adminTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/teachers", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())
}

// ---------- POST /user ----------

func TestAdminRoutes_CreateUser_AdminRoleForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "admin_route_create_admin")
	callerID := testutil.CreateTestUserWithDefaults(t, email, "ADMIN")
	token := testAccessToken(t, callerID)
	schoolID := testSchoolID(t)

	reqBody := dtos.User{
		FirstName: "New",
		LastName:  "Admin",
		Role:      dtos.Admin,
		Email:     testutil.UniqueEmail(t, "new_admin_user"),
		SchoolID:  int16(schoolID),
	}

	router := adminTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/user", token, reqBody))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Creating ADMIN users is not allowed", resp["error"])
}

func TestAdminRoutes_CreateUser_TeacherRoleSucceeds(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "admin_route_create_teacher")
	callerID := testutil.CreateTestUserWithDefaults(t, email, "ADMIN")
	token := testAccessToken(t, callerID)
	schoolID := testSchoolID(t)

	newUserEmail := testutil.UniqueEmail(t, "new_teacher_user")
	reqBody := dtos.User{
		FirstName: "New",
		LastName:  "Teacher",
		Role:      dtos.Teacher,
		Email:     newUserEmail,
		SchoolID:  int16(schoolID),
	}

	router := adminTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/user", token, reqBody))

	require.Equal(t, http.StatusCreated, w.Code, "Response body: %s", w.Body.String())

	stored := testutil.GetTestUserByEmail(t, newUserEmail)
	require.NotNil(t, stored)
	t.Cleanup(func() { testutil.DeleteTestUser(t, int(stored.ID)) })
}

func TestAdminRoutes_CreateUser_NonAdminForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "admin_route_create_student")
	callerID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, callerID)
	schoolID := testSchoolID(t)

	reqBody := dtos.User{
		FirstName: "New",
		LastName:  "Teacher",
		Role:      dtos.Teacher,
		Email:     testutil.UniqueEmail(t, "blocked_teacher_user"),
		SchoolID:  int16(schoolID),
	}

	router := adminTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/user", token, reqBody))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())
}
