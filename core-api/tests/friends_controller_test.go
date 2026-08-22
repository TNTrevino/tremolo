package tests

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
)

// friendsTestRouter builds a router with only the friends routes
// registered, mirroring how NewServer wires
// controllers.RegisterFriendsRoutes.
func friendsTestRouter() *http.ServeMux {
	mux := http.NewServeMux()
	controllers.RegisterFriendsRoutes(mux, database.Queries)
	return mux
}

// ---------- GET /api/friends ----------

func TestFriendsRoutes_GetFriends_Unauthenticated_ReturnsUnauthorized(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := friendsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/friends", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Unauthorized", resp["error"])
}

func TestFriendsRoutes_GetFriends_Authenticated_ReturnsOK(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "friends_route_get")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := friendsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/friends", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())
}

// ---------- GET /api/friends/search ----------

func TestFriendsRoutes_SearchUsers_Unauthenticated_ReturnsUnauthorized(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := friendsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/friends/search?q=test", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
}

func TestFriendsRoutes_SearchUsers_EmptyQuery_ReturnsEmptyList(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "friends_route_search_empty")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := friendsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/friends/search", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())
	assert.JSONEq(t, "[]", w.Body.String())
}

func TestFriendsRoutes_SearchUsers_WithQuery_ReturnsOK(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "friends_route_search_query")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := friendsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/friends/search?q=Test", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())
}

// ---------- POST /api/friends ----------

func TestFriendsRoutes_AddFriend_Unauthenticated_ReturnsUnauthorized(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := friendsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/friends", "", map[string]any{"friend_id": 1}))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
}

// TestFriendsRoutes_AddFriend_MissingFriendID verifies that a body with no
// friend_id field is rejected exactly like gin's `binding:"required"` used
// to reject it: 400 with "Invalid request body". httpx.Decode does not
// enforce struct tags, so the handler checks the zero value by hand.
func TestFriendsRoutes_AddFriend_MissingFriendID_ReturnsBadRequest(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "friends_route_add_missing")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := friendsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/friends", token, map[string]any{}))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Invalid request body", resp["error"])
}

// TestFriendsRoutes_AddFriend_ZeroFriendID_ReturnsBadRequest covers the same
// "required treats zero as missing" behavior, but via an explicit
// friend_id: 0 rather than an absent field.
func TestFriendsRoutes_AddFriend_ZeroFriendID_ReturnsBadRequest(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "friends_route_add_zero")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := friendsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/friends", token, map[string]any{"friend_id": 0}))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Invalid request body", resp["error"])
}

// TestFriendsRoutes_AddFriend_MalformedBody_ReturnsBadRequest covers the
// other half of the old ShouldBindJSON error path: a body that fails to
// parse as JSON at all.
func TestFriendsRoutes_AddFriend_MalformedBody_ReturnsBadRequest(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "friends_route_add_malformed")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := friendsTestRouter()
	req := httptest.NewRequest(http.MethodPost, "/api/friends", strings.NewReader("{not valid json"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Invalid request body", resp["error"])
}

func TestFriendsRoutes_AddFriend_Success_ReturnsCreated(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "friends_route_add_self")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	friendEmail := testutil.UniqueEmail(t, "friends_route_add_target")
	friendID := testutil.CreateTestUserWithDefaults(t, friendEmail, "STUDENT")

	router := friendsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/friends", token, map[string]any{"friend_id": friendID}))

	assert.Equal(t, http.StatusCreated, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Friend added successfully", resp["message"])
}

// TestFriendsRoutes_AddFriend_Self_ReturnsBadRequest exercises the service
// layer's rejection of a self-friendship, to confirm it still surfaces as a
// 400 through the converted handler.
func TestFriendsRoutes_AddFriend_Self_ReturnsBadRequest(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "friends_route_add_self_reject")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := friendsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/friends", token, map[string]any{"friend_id": userID}))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Failed to add friend", resp["error"])
}
