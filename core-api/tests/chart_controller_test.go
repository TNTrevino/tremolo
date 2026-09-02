package tests

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// chartUserPath builds the personal-metrics path for a user ID.
func chartUserPath(userID int) string {
	return "/api/charts/user/" + strconv.Itoa(userID) + "/metrics"
}

// chartTestRouter builds a router with only the chart routes registered,
// mirroring how main.go wires controllers.RegisterChartRoutes. The chart
// refactor moved param parsing and status codes out of the services, so
// these HTTP-level cases are covered here rather than in the service tests.
func chartTestRouter() *http.ServeMux {
	mux := http.NewServeMux()
	controllers.RegisterChartRoutes(mux, database.Queries)
	return mux
}

func TestChartRoutes_Unauthenticated_ReturnsUnauthorized(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := chartTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/charts/user/1/metrics", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
}

func TestChartRoutes_InvalidUserIDParam_ReturnsBadRequest(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_bad_param")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := chartTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/charts/user/abc/metrics", token, nil))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Invalid user ID parameter", resp["error"])
}

func TestChartRoutes_OtherUsersData_ReturnsForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_other_user")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := chartTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/charts/user/999999/metrics", token, nil))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Access denied", resp["error"])
}

// Ownership is reported before the query params are validated. A request
// that is wrong on both counts must still answer 403, the way it did
// before the controller/service split.
func TestChartRoutes_OtherUsersDataWithBadInterval_ReturnsForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_other_user_bad_interval")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := chartTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet,
		"/api/charts/user/999999/metrics?interval=fortnight", token, nil))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())
}

func TestChartRoutes_InvalidInterval_ReturnsBadRequest(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_bad_interval")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := chartTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet,
		chartUserPath(userID)+"?interval=fortnight", token, nil))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())
}

func TestChartRoutes_OwnData_ReturnsOK(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_own_data")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := chartTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, chartUserPath(userID), token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())
}

// TestChartRoutes_TeacherReadsEnrolledStudent_ReturnsOK verifies the #254
// rule at the chart route: a teacher who owns a class the target student is
// enrolled in gets 200 for that student's personal metrics.
func TestChartRoutes_TeacherReadsEnrolledStudent_ReturnsOK(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "chart_route_owning_teacher")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")
	token := testAccessToken(t, teacherID)

	studentEmail := testutil.UniqueEmail(t, "chart_route_owning_student")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, teacherID, "Chart Route Owning Class")
	joinTestClass(t, studentID, class.JoinCode)

	router := chartTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, chartUserPath(studentID), token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())
}

// TestChartRoutes_TeacherReadsNonStudent_ReturnsForbidden verifies that
// owning *a* class is not a blanket pass at the route level, and that the
// access guard still fires before interval validation (the
// ?interval=fortnight variant), mirroring
// TestChartRoutes_OtherUsersDataWithBadInterval_ReturnsForbidden's ordering
// guarantee for the self-only case.
func TestChartRoutes_TeacherReadsNonStudent_ReturnsForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	owningTeacherEmail := testutil.UniqueEmail(t, "chart_route_nonowning_owner")
	owningTeacherID := testutil.CreateTestUserWithDefaults(t, owningTeacherEmail, "TEACHER")

	studentEmail := testutil.UniqueEmail(t, "chart_route_nonowning_student")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, owningTeacherID, "Chart Route Non-Owning Target Class")
	joinTestClass(t, studentID, class.JoinCode)

	otherTeacherEmail := testutil.UniqueEmail(t, "chart_route_nonowning_other")
	otherTeacherID := testutil.CreateTestUserWithDefaults(t, otherTeacherEmail, "TEACHER")
	createTestClass(t, otherTeacherID, "Chart Route Non-Owning Other's Own Class")
	token := testAccessToken(t, otherTeacherID)

	router := chartTestRouter()

	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, chartUserPath(studentID), token, nil))
	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())
	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Access denied", resp["error"])

	// Same guard, now with a query string that would fail its own
	// validation -- still 403, not 400, so the ordering guarantee holds
	// for the teacher-access rule too.
	w2 := httptest.NewRecorder()
	router.ServeHTTP(w2, bearerRequest(t, http.MethodGet,
		chartUserPath(studentID)+"?interval=fortnight", token, nil))
	assert.Equal(t, http.StatusForbidden, w2.Code, "Response body: %s", w2.Body.String())
	var resp2 map[string]any
	testutil.ParseJSONResponse(t, w2, &resp2)
	assert.Equal(t, "Access denied", resp2["error"])
}

func TestChartRoutes_ClassMetricsNonTeacher_ReturnsForbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_class_metrics_student")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := chartTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/charts/teacher/class-metrics", token, nil))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Only teachers can access class metrics", resp["error"])
}

func TestChartRoutes_ClassMetricsTeacher_ReturnsOK(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "chart_class_metrics_teacher")
	userID := testutil.CreateTestUserWithDefaults(t, email, "TEACHER")
	token := testAccessToken(t, userID)

	router := chartTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/charts/teacher/class-metrics", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())
}

// TestChartRoutes_ClassMetricsTeacherWithRoster_ReturnsPopulatedSeries
// covers #253 at the HTTP layer: a teacher with a real class_students
// roster (not the legacy teacher_student table) must get back populated
// series, not empty ones.
func TestChartRoutes_ClassMetricsTeacherWithRoster_ReturnsPopulatedSeries(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	teacherEmail := testutil.UniqueEmail(t, "chart_class_metrics_roster")
	teacherID := testutil.CreateTestUserWithDefaults(t, teacherEmail, "TEACHER")
	token := testAccessToken(t, teacherID)

	studentEmail := testutil.UniqueEmail(t, "chart_class_metrics_roster_student")
	studentID := testutil.CreateTestUserWithDefaults(t, studentEmail, "STUDENT")

	class := createTestClass(t, teacherID, "Chart Route Roster Class")
	joinTestClass(t, studentID, class.JoinCode)
	testutil.CreateTestNoteGameEntryWithDefaults(t, studentID)

	router := chartTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/charts/teacher/class-metrics", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp dtos.MultiMetricChartData
	testutil.ParseJSONResponse(t, w, &resp)
	require.Len(t, resp.NPM, 1)
	assert.InDelta(t, 75.0, resp.Accuracy[0].Value, 0.001)
}
