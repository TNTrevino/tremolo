package tests

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
)

// userInfoTestRouter builds a router with only the user-info routes
// registered, mirroring how NewServer wires
// controllers.RegisterUserInfoRoutes.
func userInfoTestRouter() *http.ServeMux {
	mux := http.NewServeMux()
	controllers.RegisterUserInfoRoutes(mux, database.Queries)
	return mux
}

// TestGetGeneralUserInfoRoute_UserNotFound verifies that requesting
// general-info for a user ID that authenticates fine (a valid JWT) but does
// not exist in the database returns 404, not 500. Regression test for the
// dead string-comparison 404 branch: the controller used to compare
// err.Error() against a "user not found with ID: ..." string that the
// service never actually produced (it returned raw sql.ErrNoRows), so this
// path fell through to the 500 branch.
func TestGetGeneralUserInfoRoute_UserNotFound(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// A large ID that authenticates (GenerateAccessToken doesn't touch the
	// DB) but does not exist in tremolo_user, so the self-access check
	// passes (the caller and the target are the same nonexistent id) and
	// the service call falls through to the not-found path.
	nonExistentUserID := 999999999
	token := testAccessToken(t, nonExistentUserID)

	router := userInfoTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/users/999999999/general-info", token, nil))

	assert.Equal(t, http.StatusNotFound, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "User not found", resp["error"])
}

// TestGetGeneralUserInfoRoute_Success verifies the happy path still returns
// 200 with the expected shape for an existing, authenticated user.
func TestGetGeneralUserInfoRoute_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "userinfo_route_success")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := userInfoTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/users/"+strconv.Itoa(userID)+"/general-info", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())
}

// TestGetGeneralUserInfoRoute_OwningTeacher_ReturnsOK verifies the #254
// route-level contract: a teacher who owns a class the target student is
// enrolled in gets 200, with the student's own first name in the body.
func TestGetGeneralUserInfoRoute_OwningTeacher_ReturnsOK(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "userinfo_route_owning_teacher")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")
	token := testAccessToken(t, teacherID)

	studentEmail := testutil.UniqueEmail(t, "userinfo_route_owning_student")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, teacherID, "User Info Route Owning Class")
	joinTestClass(t, studentID, class.JoinCode)

	router := userInfoTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/users/"+strconv.Itoa(studentID)+"/general-info", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	// CreateTestUserWithDefaults's fixed first name -- see testutil/db.go.
	assert.Equal(t, "Test", resp["first_name"])
}

// TestGetGeneralUserInfoRoute_NonOwningTeacher_ReturnsForbidden verifies
// that a teacher who owns a class, just not one the target student is
// enrolled in, is still forbidden -- owning *a* class is not a blanket
// pass.
func TestGetGeneralUserInfoRoute_NonOwningTeacher_ReturnsForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	owningTeacherEmail := testutil.UniqueEmail(t, "userinfo_route_nonowning_owner")
	owningTeacherID := testutil.CreateTestUserWithDefaults(t, owningTeacherEmail, "TEACHER")

	studentEmail := testutil.UniqueEmail(t, "userinfo_route_nonowning_student")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, owningTeacherID, "User Info Route Non-Owning Target Class")
	joinTestClass(t, studentID, class.JoinCode)

	otherTeacherEmail := testutil.UniqueEmail(t, "userinfo_route_nonowning_other")
	otherTeacherID := testutil.CreateTestUserWithDefaults(t, otherTeacherEmail, "TEACHER")
	createTestClass(t, otherTeacherID, "User Info Route Non-Owning Other's Own Class")
	token := testAccessToken(t, otherTeacherID)

	router := userInfoTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/users/"+strconv.Itoa(studentID)+"/general-info", token, nil))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Access denied", resp["error"])
}

// TestGetGeneralUserInfoRoute_OtherStudent_ReturnsForbidden verifies the
// pre-existing peer-student rule survives at the route level: a student
// with no classes of their own cannot read another student's info.
func TestGetGeneralUserInfoRoute_OtherStudent_ReturnsForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	studentEmail := testutil.UniqueEmail(t, "userinfo_route_peer_student")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	otherStudentEmail := testutil.UniqueEmail(t, "userinfo_route_peer_other")
	otherStudentID := testutil.CreateTestUserWithDefaults(t, otherStudentEmail, "STUDENT")
	token := testAccessToken(t, otherStudentID)

	router := userInfoTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/users/"+strconv.Itoa(studentID)+"/general-info", token, nil))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Access denied", resp["error"])
}
