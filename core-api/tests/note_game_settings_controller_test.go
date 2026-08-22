package tests

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
)

// noteGameSettingsTestRouter builds a router with only the note game
// settings routes registered, mirroring how NewServer wires
// controllers.RegisterNoteGameSettingsRoutes.
func noteGameSettingsTestRouter() *http.ServeMux {
	mux := http.NewServeMux()
	controllers.RegisterNoteGameSettingsRoutes(mux, database.Queries)
	return mux
}

func validNoteGameSettingsBody() map[string]any {
	return map[string]any{
		"game_mode":  "time",
		"time_limit": 60,
		"note_limit": 25,
		"scale":      "C major",
		"octave":     4,
		"low_note":   "C4",
		"high_note":  "C5",
		"clef":       "treble",
	}
}

// TestGetNoteGameSettingsRoute_Unauthorized verifies the GET route rejects a
// request with no bearer token.
func TestGetNoteGameSettingsRoute_Unauthorized(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := noteGameSettingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/note-game/settings", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
}

// TestUpdateNoteGameSettingsRoute_Unauthorized verifies the PUT route
// rejects a request with no bearer token.
func TestUpdateNoteGameSettingsRoute_Unauthorized(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := noteGameSettingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPut, "/api/note-game/settings", "", validNoteGameSettingsBody()))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
}

// TestGetNoteGameSettingsRoute_NoneSaved verifies a user with no saved
// settings gets a 200 with a null settings field, not a 404 or 500.
func TestGetNoteGameSettingsRoute_NoneSaved(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "note_game_settings_none")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := noteGameSettingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/note-game/settings", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Nil(t, resp["settings"])
}

// TestUpdateNoteGameSettingsRoute_InvalidBody verifies a request body that
// fails to decode as JSON returns 400 with "Invalid request body".
func TestUpdateNoteGameSettingsRoute_InvalidBody(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "note_game_settings_invalid")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := noteGameSettingsTestRouter()
	w := httptest.NewRecorder()
	req := bearerRequest(t, http.MethodPut, "/api/note-game/settings", token, nil)
	req.Body = http.NoBody
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Invalid request body", resp["error"])
}

// TestUpdateNoteGameSettingsRoute_FailsValidation verifies a well-formed but
// semantically invalid body still returns 400 with the service's error
// message, exercising the req.Validate() call inside the service layer.
func TestUpdateNoteGameSettingsRoute_FailsValidation(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "note_game_settings_bad_value")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	body := validNoteGameSettingsBody()
	body["clef"] = "alto" // not one of "treble"/"bass"

	router := noteGameSettingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPut, "/api/note-game/settings", token, body))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())
}

// TestUpdateThenGetNoteGameSettingsRoute_Success verifies the happy path:
// PUT saves settings and returns 200 with the saved shape, and a
// subsequent GET returns the same values instead of null.
func TestUpdateThenGetNoteGameSettingsRoute_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "note_game_settings_roundtrip")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := noteGameSettingsTestRouter()

	putW := httptest.NewRecorder()
	router.ServeHTTP(putW, bearerRequest(t, http.MethodPut, "/api/note-game/settings", token, validNoteGameSettingsBody()))
	assert.Equal(t, http.StatusOK, putW.Code, "Response body: %s", putW.Body.String())

	var putResp map[string]any
	testutil.ParseJSONResponse(t, putW, &putResp)
	assert.Equal(t, "time", putResp["game_mode"])
	assert.Equal(t, "treble", putResp["clef"])

	getW := httptest.NewRecorder()
	router.ServeHTTP(getW, bearerRequest(t, http.MethodGet, "/api/note-game/settings", token, nil))
	assert.Equal(t, http.StatusOK, getW.Code, "Response body: %s", getW.Body.String())

	var getResp map[string]any
	testutil.ParseJSONResponse(t, getW, &getResp)
	assert.Equal(t, "time", getResp["game_mode"])
	assert.Equal(t, "treble", getResp["clef"])
}
