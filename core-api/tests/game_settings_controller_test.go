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
	"github.com/stretchr/testify/require"
)

// gameSettingsTestRouter builds a router with only the game-settings routes
// registered, mirroring how NewServer wires
// controllers.RegisterGameSettingsRoutes.
func gameSettingsTestRouter() *http.ServeMux {
	mux := http.NewServeMux()
	controllers.RegisterGameSettingsRoutes(mux, database.Queries)
	return mux
}

// TestGetGameSettingsRoute_RequiresAuth verifies the GET route is behind
// RequireAuth: no bearer token means 401, not a fall-through to the handler.
func TestGetGameSettingsRoute_RequiresAuth(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := gameSettingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/game-settings?game_type=scale", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
}

// TestUpdateGameSettingsRoute_RequiresAuth verifies the PUT route is behind
// RequireAuth as well.
func TestUpdateGameSettingsRoute_RequiresAuth(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := gameSettingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPut, "/api/game-settings", "", map[string]any{
		"game_type": "scale",
		"config":    map[string]any{"scaleTypes": []string{"major"}},
	}))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
}

// TestGetGameSettingsRoute_InvalidGameType verifies the game_type query
// parameter reaches the service layer: an unknown game type is rejected
// with the same 400 the gin handler returned, not silently accepted.
func TestGetGameSettingsRoute_InvalidGameType(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "game_settings_get_invalid")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := gameSettingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/game-settings?game_type=not-a-real-game", token, nil))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Invalid game_type", resp["error"])
}

// TestGetGameSettingsRoute_NoSavedSettings verifies a valid game type with
// nothing saved yet returns 200 with a null settings field, matching the
// gin handler's (nil, nil) branch.
func TestGetGameSettingsRoute_NoSavedSettings(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "game_settings_get_empty")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := gameSettingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/game-settings?game_type=chord", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Nil(t, resp["settings"])
}

// TestGameSettingsRoute_PutThenGetRoundTrip verifies the game_type carried
// in the PUT body reaches the service and is what the subsequent GET (keyed
// off the game_type query parameter) reads back — the query/body split is
// the part a controller conversion could silently break.
func TestGameSettingsRoute_PutThenGetRoundTrip(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "game_settings_roundtrip")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := gameSettingsTestRouter()

	putW := httptest.NewRecorder()
	router.ServeHTTP(putW, bearerRequest(t, http.MethodPut, "/api/game-settings", token, map[string]any{
		"game_type": "key_signature",
		"config":    map[string]any{"maxAccidentals": 4, "keyTypes": []string{"sharps"}},
	}))
	require.Equal(t, http.StatusOK, putW.Code, "Response body: %s", putW.Body.String())

	var putResp map[string]any
	testutil.ParseJSONResponse(t, putW, &putResp)
	assert.Equal(t, "key_signature", putResp["game_type"])

	getW := httptest.NewRecorder()
	router.ServeHTTP(getW, bearerRequest(t, http.MethodGet, "/api/game-settings?game_type=key_signature", token, nil))
	require.Equal(t, http.StatusOK, getW.Code, "Response body: %s", getW.Body.String())

	var getResp map[string]any
	testutil.ParseJSONResponse(t, getW, &getResp)
	assert.Equal(t, "key_signature", getResp["game_type"])

	config, ok := getResp["config"].(map[string]any)
	require.True(t, ok, "expected config object, got %#v", getResp["config"])
	assert.Equal(t, float64(4), config["maxAccidentals"])
}

// TestUpdateGameSettingsRoute_InvalidBody verifies a body that fails to
// decode as JSON still returns the same 400 the gin ShouldBindJSON failure
// returned.
func TestUpdateGameSettingsRoute_InvalidBody(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "game_settings_put_baddecode")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	req := httptest.NewRequest(http.MethodPut, "/api/game-settings", strings.NewReader(`{not valid json`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	router := gameSettingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Invalid request body", resp["error"])
}

// TestUpdateGameSettingsRoute_InvalidGameType verifies a well-formed body
// with a game type the service rejects (e.g. "note", which has its own
// dedicated settings table) still returns 400 with the service's
// validation message, matching the old c.JSON(400, err.Error()) branch.
func TestUpdateGameSettingsRoute_InvalidGameType(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "game_settings_put_invalid")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := gameSettingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPut, "/api/game-settings", token, map[string]any{
		"game_type": "note",
		"config":    map[string]any{"foo": "bar"},
	}))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())
}
