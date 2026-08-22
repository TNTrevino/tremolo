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

// userInfoTestRouter builds a router with only the user-info routes
// registered, mirroring how main.go wires controllers.SetupUserInfoRoutes.
func userInfoTestRouter() *gin.Engine {
	router := gin.New()
	controllers.SetupUserInfoRoutes(router)
	return router
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
	// DB) but does not exist in tremolo_user, so the ownership check passes
	// and the service call falls through to the not-found path.
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
