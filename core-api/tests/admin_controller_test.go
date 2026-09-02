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

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// adminTestRouter builds a mux with only the admin routes registered,
// mirroring how NewServer wires controllers.RegisterAdminRoutes.
func adminTestRouter() *http.ServeMux {
	mux := http.NewServeMux()
	controllers.RegisterAdminRoutes(mux, database.Queries)
	return mux
}

// bearerRequest builds an httptest.NewRequest with an optional JSON body
// and Authorization header.
//
// Other test files (tests/user_info_controller_test.go,
// tests/keyboard_bindings_controller_test.go) call this helper directly,
// so its name and signature must not change.
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

// testAccessToken is also called from tests/user_info_controller_test.go
// and tests/keyboard_bindings_controller_test.go; keep its name and
// signature stable.
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

// ---------- every route: auth + admin-role enforcement ----------

// TestAdminRoutes_EveryRoute_RequiresAuthAndAdminRole verifies that each
// admin route rejects both an anonymous caller and an authenticated
// non-admin caller. These routes were unauthenticated until recently, so
// this guards against any converted route losing either
// middleware.RequireAuth or adminOnly.
func TestAdminRoutes_EveryRoute_RequiresAuthAndAdminRole(t *testing.T) {
	t.Parallel()

	routes := []struct {
		name   string
		method string
		path   string
	}{
		{"GetTeachers", http.MethodGet, "/teachers"},
		{"GetTeacher", http.MethodGet, "/teacher/1"},
		{"GetStudents", http.MethodGet, "/students"},
		{"GetStudent", http.MethodGet, "/student/1"},
		{"CreateUser", http.MethodPost, "/user"},
	}

	for _, route := range routes {
		t.Run(route.name+"_Unauthenticated", func(t *testing.T) {
			t.Parallel()
			testutil.SetupTestDB(t)

			router := adminTestRouter()
			w := httptest.NewRecorder()
			router.ServeHTTP(w, bearerRequest(t, route.method, route.path, "", nil))

			assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
		})

		t.Run(route.name+"_NonAdmin", func(t *testing.T) {
			t.Parallel()
			testutil.SetupTestDB(t)

			email := testutil.UniqueEmail(t, "admin_route_nonadmin")
			userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
			token := testAccessToken(t, userID)

			router := adminTestRouter()
			w := httptest.NewRecorder()
			router.ServeHTTP(w, bearerRequest(t, route.method, route.path, token, nil))

			assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())
		})
	}
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

	reqBody := dtos.CreateUserRequest{
		FirstName: "New",
		LastName:  "Admin",
		Role:      dtos.Admin,
		Email:     testutil.UniqueEmail(t, "new_admin_user"),
		Password:  "ValidPass123!",
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
	reqBody := dtos.CreateUserRequest{
		FirstName: "New",
		LastName:  "Teacher",
		Role:      dtos.Teacher,
		Email:     newUserEmail,
		Password:  "ValidPass123!",
		SchoolID:  int16(schoolID),
	}

	router := adminTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/user", token, reqBody))

	require.Equal(t, http.StatusCreated, w.Code, "Response body: %s", w.Body.String())

	stored := testutil.GetTestUserByEmail(t, newUserEmail)
	require.NotNil(t, stored)
	t.Cleanup(func() { testutil.DeleteTestUser(t, int(stored.ID)) })

	err := bcrypt.CompareHashAndPassword([]byte(stored.Password), []byte("ValidPass123!"))
	assert.NoError(t, err, "stored password should be a valid bcrypt hash of the supplied password")
}

func TestAdminRoutes_CreateUser_NonAdminForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "admin_route_create_student")
	callerID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, callerID)
	schoolID := testSchoolID(t)

	reqBody := dtos.CreateUserRequest{
		FirstName: "New",
		LastName:  "Teacher",
		Role:      dtos.Teacher,
		Email:     testutil.UniqueEmail(t, "blocked_teacher_user"),
		Password:  "ValidPass123!",
		SchoolID:  int16(schoolID),
	}

	router := adminTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/user", token, reqBody))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())
}
