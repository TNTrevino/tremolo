package tests

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
)

// classTestRouter builds a router with only the class/assignment routes
// registered, mirroring how main.go wires controllers.RegisterClassRoutes.
func classTestRouter() *http.ServeMux {
	mux := http.NewServeMux()
	controllers.RegisterClassRoutes(mux, database.Queries)
	return mux
}

// TestClassAndChartRoutesRegister registers every route this package's two
// controllers own on a single mux. http.ServeMux panics at registration
// time on a malformed or conflicting pattern (e.g. a leftover ":id"-style
// param, or a wildcard colliding with a literal segment), so this is a
// smoke test that the whole converted pattern set is valid - it need not
// assert anything beyond "did not panic".
func TestClassAndChartRoutesRegister(t *testing.T) {
	t.Parallel()

	mux := http.NewServeMux()
	controllers.RegisterClassRoutes(mux, database.Queries)
	controllers.RegisterChartRoutes(mux, database.Queries)
}

func TestClassRoutes_Unauthenticated_ReturnsUnauthorized(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := classTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/classes", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
}

func TestClassRoutes_CreateClass_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "class_route_create"), "TEACHER")
	token := testAccessToken(t, teacherID)

	router := classTestRouter()
	w := httptest.NewRecorder()
	body := map[string]any{"name": "Wind Ensemble"}
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/classes", token, body))

	assert.Equal(t, http.StatusCreated, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Wind Ensemble", resp["name"])
}

func TestClassRoutes_CreateClass_NonTeacher_ReturnsForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	studentID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "class_route_create_student"), "STUDENT")
	token := testAccessToken(t, studentID)

	router := classTestRouter()
	w := httptest.NewRecorder()
	body := map[string]any{"name": "Nope"}
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/classes", token, body))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Forbidden", resp["error"])
}

// TestClassRoutes_CreateClass_InvalidBody_ReturnsBadRequest is a regression
// test for the httpx.Decode swap: a malformed JSON body must still fail the
// same way c.ShouldBindJSON's decode error did.
func TestClassRoutes_CreateClass_InvalidBody_ReturnsBadRequest(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "class_route_bad_body"), "TEACHER")
	token := testAccessToken(t, teacherID)

	router := classTestRouter()
	w := httptest.NewRecorder()
	// Send a body that is present but not valid JSON.
	req := httptest.NewRequest(http.MethodPost, "/api/classes", strings.NewReader("{not json"))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Invalid request body", resp["error"])
}

// TestClassRoutes_GetClassRoster_InvalidIDParam_ReturnsBadRequest exercises
// the "{id}" path parameter: a non-numeric value must produce a 400.
func TestClassRoutes_GetClassRoster_InvalidIDParam_ReturnsBadRequest(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "class_route_bad_id"), "TEACHER")
	token := testAccessToken(t, teacherID)

	router := classTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/classes/abc/roster", token, nil))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Invalid id", resp["error"])
}

// TestClassRoutes_RemoveStudentFromClass_PathParams exercises a route with
// two path parameters in the same pattern ("{id}/students/{studentId}"),
// which is where a bad ServeMux pattern conversion would most likely leave
// one of them unparsed.
func TestClassRoutes_RemoveStudentFromClass_PathParams(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "class_route_remove_t"), "TEACHER")
	studentID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "class_route_remove_s"), "STUDENT")
	teacherToken := testAccessToken(t, teacherID)

	class := createTestClass(t, teacherID, "Percussion Ensemble")
	joinTestClass(t, studentID, class.JoinCode)

	router := classTestRouter()
	w := httptest.NewRecorder()
	path := "/api/classes/" + strconv.Itoa(class.ID) + "/students/" + strconv.Itoa(studentID)
	router.ServeHTTP(w, bearerRequest(t, http.MethodDelete, path, teacherToken, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Student removed", resp["message"])
}

func TestAssignmentRoutes_ListStudentAssignments_Unauthenticated_ReturnsUnauthorized(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := classTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/assignments", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
}

// TestAssignmentRoutes_CreateAssignment_InvalidGameType_ReturnsBadRequest
// checks that the controller's httpx.DecodeValid call rejects an invalid
// game_type before the service runs, and reports the specific field
// problem from CreateAssignmentRequest.Valid.
func TestAssignmentRoutes_CreateAssignment_InvalidGameType_ReturnsBadRequest(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "assignment_route_bad_type"), "TEACHER")
	token := testAccessToken(t, teacherID)
	class := createTestClass(t, teacherID, "Choir")

	router := classTestRouter()
	w := httptest.NewRecorder()
	body := map[string]any{
		"title":     "Warmup",
		"game_type": "not-a-real-game",
		"config":    map[string]any{"level": "1"},
	}
	path := "/api/classes/" + strconv.Itoa(class.ID) + "/assignments"
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, path, token, body))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "GameType: must be a valid game type", resp["error"])
}

// TestAssignmentRoutes_DeleteAssignment_PathParam exercises the
// "/api/assignments/{id}" pattern end to end.
func TestAssignmentRoutes_DeleteAssignment_PathParam(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "assignment_route_delete"), "TEACHER")
	token := testAccessToken(t, teacherID)
	class := createTestClass(t, teacherID, "Orchestra")

	router := classTestRouter()
	w := httptest.NewRecorder()
	body := map[string]any{
		"title":     "Scale Warmup",
		"game_type": "scale",
		"config":    map[string]any{"level": "1"},
	}
	createPath := "/api/classes/" + strconv.Itoa(class.ID) + "/assignments"
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, createPath, token, body))
	assert.Equal(t, http.StatusCreated, w.Code, "Response body: %s", w.Body.String())

	var created dtos.AssignmentResponse
	testutil.ParseJSONResponse(t, w, &created)

	w = httptest.NewRecorder()
	deletePath := "/api/assignments/" + strconv.Itoa(created.ID)
	router.ServeHTTP(w, bearerRequest(t, http.MethodDelete, deletePath, token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Assignment deleted", resp["message"])
}
