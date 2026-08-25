package tests

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// noteGameTestRouter builds a router with only the note-game routes
// registered, mirroring how NewServer wires
// controllers.RegisterNoteGameRoutes.
func noteGameTestRouter() *http.ServeMux {
	mux := http.NewServeMux()
	controllers.RegisterNoteGameRoutes(mux, database.Queries)
	return mux
}

// assertNoteGameEntryCreated POSTs entry, asserts the standard 201 response
// shape (saved message + an id), and registers cleanup for the saved row.
// Shared by the create-entry tests that only vary the entry itself.
func assertNoteGameEntryCreated(t *testing.T, router *http.ServeMux, token string, entry dtos.Entry) {
	t.Helper()

	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/note-game/entry", token, entry))

	require.Equal(t, http.StatusCreated, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Note game entry saved successfully", resp["message"])
	require.Contains(t, resp, "id")

	t.Cleanup(func() {
		testutil.DeleteTestNoteGameEntry(t, int64(resp["id"].(float64)))
	})
}

// TestCreateNoteGameEntryRoute_Unauthenticated verifies the route requires
// authentication, i.e. that middleware.RequireAuth is actually wired in
// front of the handler.
func TestCreateNoteGameEntryRoute_Unauthenticated(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := noteGameTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/note-game/entry", "", dtos.Entry{}))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Unauthorized", resp["error"])
}

// TestCreateNoteGameEntryRoute_Success verifies the happy path returns 201
// with the new entry's id and the message "Note game entry saved
// successfully".
func TestCreateNoteGameEntryRoute_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "note_game_route_create_success")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	entry := dtos.Entry{
		UserID:           int64(userID),
		TimeLength:       "00:05:30",
		TotalQuestions:   20,
		CorrectQuestions: 15,
		NPM:              3,
	}

	assertNoteGameEntryCreated(t, noteGameTestRouter(), token, entry)
}

// TestCreateNoteGameEntryRoute_Forbidden verifies that a user cannot create
// an entry for another user's ID: the decoded body's user_id mismatches the
// authenticated user, and the service maps that to 403.
func TestCreateNoteGameEntryRoute_Forbidden(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email1 := testutil.UniqueEmail(t, "note_game_route_forbidden_user1")
	userID1 := testutil.CreateTestUserWithDefaults(t, email1, "STUDENT")
	token1 := testAccessToken(t, userID1)

	email2 := testutil.UniqueEmail(t, "note_game_route_forbidden_user2")
	userID2 := testutil.CreateTestUserWithDefaults(t, email2, "STUDENT")

	entry := dtos.Entry{
		UserID:           int64(userID2),
		TimeLength:       "00:05:30",
		TotalQuestions:   20,
		CorrectQuestions: 15,
		NPM:              3,
	}

	router := noteGameTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/note-game/entry", token1, entry))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Not authorized", resp["error"])
}

// TestCreateNoteGameEntryRoute_InvalidBody verifies a decode failure (a
// non-JSON body) returns 400 with error "Invalid request body".
func TestCreateNoteGameEntryRoute_InvalidBody(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "note_game_route_invalid_body")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	req := httptest.NewRequest(http.MethodPost, "/api/note-game/entry", strings.NewReader("not-json"))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	router := noteGameTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Invalid request body", resp["error"])
}

// TestCreateNoteGameEntryRoute_ZeroCorrectSaves verifies a legitimate 0/10
// score -- CorrectQuestions == 0 -- is not rejected by the presence check
// that used to guard the field. Issue #252.
func TestCreateNoteGameEntryRoute_ZeroCorrectSaves(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "note_game_route_zero_correct")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	entry := dtos.Entry{
		UserID:           int64(userID),
		TimeLength:       "00:05:30",
		TotalQuestions:   10,
		CorrectQuestions: 0,
		NPM:              3,
	}

	assertNoteGameEntryCreated(t, noteGameTestRouter(), token, entry)
}

// TestCreateNoteGameEntryRoute_NPMAboveOldInt8CapSaves verifies an NPM value
// above the old int8 cap (127) survives JSON decode and saves. Issue #252.
func TestCreateNoteGameEntryRoute_NPMAboveOldInt8CapSaves(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "note_game_route_npm_above_cap")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	entry := dtos.Entry{
		UserID:           int64(userID),
		TimeLength:       "00:05:30",
		TotalQuestions:   20,
		CorrectQuestions: 15,
		NPM:              200,
	}

	assertNoteGameEntryCreated(t, noteGameTestRouter(), token, entry)
}

// TestCreateNoteGameEntryRoute_UserIDAboveOldInt16Cap verifies a UserID
// value above the old int16 cap (32767) survives JSON decode and Valid().
// No user with this ID is seeded: the request instead reaches the
// service's caller-matches-user_id authorization check and is rejected
// with 403, not 400 -- proving decode+Valid passed for the wide value
// without needing to seed 40000 users. Issue #252.
func TestCreateNoteGameEntryRoute_UserIDAboveOldInt16Cap(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "note_game_route_userid_above_cap")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	entry := dtos.Entry{
		UserID:           40000,
		TimeLength:       "00:05:30",
		TotalQuestions:   20,
		CorrectQuestions: 15,
		NPM:              3,
	}

	router := noteGameTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPost, "/api/note-game/entry", token, entry))

	assert.Equal(t, http.StatusForbidden, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Not authorized", resp["error"])
}

// TestGetRecentNoteGameEntriesRoute_Unauthenticated verifies the route
// requires authentication.
func TestGetRecentNoteGameEntriesRoute_Unauthenticated(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := noteGameTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/note-game/recent", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
}

// TestGetRecentNoteGameEntriesRoute_Success verifies the happy path
// including that the game_type query parameter is still read correctly
// (r.URL.Query().Get replacing c.Query).
func TestGetRecentNoteGameEntriesRoute_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "note_game_route_recent_success")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	router := noteGameTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/note-game/recent?game_type=note", token, nil))

	require.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp []dtos.NoteGameEntryResponse
	testutil.ParseJSONResponse(t, w, &resp)
	require.Len(t, resp, 1)
	assert.Equal(t, userID, resp[0].UserID)
}

// TestGetRecentNoteGameEntriesRoute_InvalidGameType verifies an unknown
// game_type still returns the same 400 the service mapped through
// services.ErrValidation.
func TestGetRecentNoteGameEntriesRoute_InvalidGameType(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "note_game_route_recent_invalid_type")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := noteGameTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/note-game/recent?game_type=not-a-real-game", token, nil))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Invalid game_type", resp["error"])
}

// TestGetDailyActivityCountsRoute_Unauthenticated verifies the route
// requires authentication.
func TestGetDailyActivityCountsRoute_Unauthenticated(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	router := noteGameTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/note-game/activity", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())
}

// TestGetDailyActivityCountsRoute_Success verifies the happy path still
// returns 200 with per-day counts.
func TestGetDailyActivityCountsRoute_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "note_game_route_activity_success")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	testutil.CreateTestNoteGameEntryWithDefaults(t, userID)

	router := noteGameTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/note-game/activity", token, nil))

	require.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp []dtos.DailyActivityCount
	testutil.ParseJSONResponse(t, w, &resp)
	require.Len(t, resp, 1)
	assert.Equal(t, 1, resp[0].GameCount)
}
