package tests

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
)

// exportResponseKeys are UserExport's eight top-level JSON keys.
var exportResponseKeys = []string{
	"exported_at",
	"profile",
	"settings",
	"keyboard_bindings",
	"score_entries",
	"classes",
	"assignment_attempts",
	"friends",
}

// TestExportUserDataRoute_Self_Returns200 covers the happy path: the
// caller reads their own export and gets every top-level section back.
func TestExportUserDataRoute_Self_Returns200(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	userID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "export_route_self"), "STUDENT")
	token := testAccessToken(t, userID)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/users/"+strconv.Itoa(userID)+"/export", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	for _, key := range exportResponseKeys {
		assert.Contains(t, response, key)
	}
}

// TestExportUserDataRoute_OtherUser_Returns403 covers the self-only
// rule: a caller cannot read another user's export, full stop.
func TestExportUserDataRoute_OtherUser_Returns403(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	userID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "export_route_other"), "STUDENT")
	token := testAccessToken(t, userID)
	otherUserID := userID + 1

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/users/"+strconv.Itoa(otherUserID)+"/export", token, nil))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Access denied", response["error"])
}

// TestExportUserDataRoute_TeacherOfEnrolledStudent_Returns403 pins the
// deliberate asymmetry with general-info/charts: a teacher's interest in
// a student's performance is scoped to their own class elsewhere in this
// API, but export goes further than performance -- it bundles the
// account's email, every saved setting, and the names of classes
// belonging to OTHER teachers. Being the student's teacher, even for an
// active class they actually share, earns no exception here.
func TestExportUserDataRoute_TeacherOfEnrolledStudent_Returns403(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	teacherID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "export_route_teacher"), "TEACHER")
	studentID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "export_route_teacher_student"), "STUDENT")
	class := createTestClass(t, teacherID, "Export Route Class")
	joinTestClass(t, studentID, class.JoinCode)

	teacherToken := testAccessToken(t, teacherID)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/users/"+strconv.Itoa(studentID)+"/export", teacherToken, nil))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Access denied", response["error"])
}

// TestExportUserDataRoute_Unauthenticated_Returns401 covers the missing
// bearer token.
func TestExportUserDataRoute_Unauthenticated_Returns401(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/users/1/export", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Unauthorized", response["error"])
}

// TestExportUserDataRoute_NonNumericID_Returns400 covers a path id that
// isn't a number.
func TestExportUserDataRoute_NonNumericID_Returns400(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	userID := testutil.CreateTestUserWithDefaults(t, testutil.UniqueEmail(t, "export_route_badid"), "STUDENT")
	token := testAccessToken(t, userID)

	router := accountTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/users/abc/export", token, nil))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var response map[string]any
	testutil.ParseJSONResponse(t, w, &response)
	assert.Equal(t, "Invalid user ID parameter", response["error"])
}
