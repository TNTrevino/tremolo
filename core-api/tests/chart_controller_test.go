package tests

import (
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"sight-reading/controllers"
	"sight-reading/tests/testutil"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// chartUserPath builds the personal-metrics path for a user ID.
func chartUserPath(userID int) string {
	return "/api/charts/user/" + strconv.Itoa(userID) + "/metrics"
}

// chartTestRouter builds a router with only the chart routes registered,
// mirroring how main.go wires controllers.SetupChartRoutes. The chart
// refactor moved param parsing and status codes out of the services, so
// these HTTP-level cases are covered here rather than in the service tests.
func chartTestRouter() *gin.Engine {
	router := gin.New()
	controllers.SetupChartRoutes(router)
	return router
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
