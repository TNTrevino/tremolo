package tests

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// keyboardBindingsTestRouter builds a router with only the keyboard
// bindings routes registered, mirroring how NewServer wires
// controllers.RegisterKeyboardBindingsRoutes.
func keyboardBindingsTestRouter() *http.ServeMux {
	mux := http.NewServeMux()
	controllers.RegisterKeyboardBindingsRoutes(mux, database.Queries)
	return mux
}

// ---------- GET /api/note-game/keyboard-bindings ----------

func TestGetKeyboardBindings_Authenticated_WithBindings(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "get_kb_with")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	router := keyboardBindingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/note-game/keyboard-bindings", token, nil))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp dtos.KeyboardBindingsResponse
	testutil.ParseJSONResponse(t, w, &resp)

	assert.Equal(t, userID, resp.UserID)
	assert.NotZero(t, resp.ID)
	// Verify default bindings were seeded
	assert.Equal(t, "a", resp.KeyBindings.KeyC)
	assert.Equal(t, "s", resp.KeyBindings.KeyD)
	assert.Equal(t, "q", resp.KeyBindings.KeyCSharp)
	assert.Equal(t, "z", resp.KeyBindings.KeyCFlat)
}

func TestGetKeyboardBindings_Authenticated_WithoutBindings(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "get_kb_without")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	// Delete the auto-seeded bindings so we can test the 404 path
	err := database.Queries.DeleteKeyboardBindings(context.Background(), int32(userID))
	require.NoError(t, err, "failed to delete seeded keyboard bindings")

	router := keyboardBindingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/note-game/keyboard-bindings", token, nil))

	assert.Equal(t, http.StatusNotFound, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "No keyboard bindings found", resp["error"])
}

func TestGetKeyboardBindings_Unauthenticated(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// No Authorization header set
	router := keyboardBindingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodGet, "/api/note-game/keyboard-bindings", "", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Unauthorized", resp["error"])
}

// ---------- PUT /api/note-game/keyboard-bindings ----------

func validCustomBindings() dtos.KeyboardBindingsRequest {
	return dtos.KeyboardBindingsRequest{
		KeyBindings: dtos.KeyBindings{
			KeyC: "1", KeyD: "2", KeyE: "3", KeyF: "4", KeyG: "5", KeyA: "6", KeyB: "7",
			KeyCSharp: "q", KeyDSharp: "w", KeyESharp: "e", KeyFSharp: "r", KeyGSharp: "t", KeyASharp: "y", KeyBSharp: "u",
			KeyCFlat: "z", KeyDFlat: "x", KeyEFlat: "c", KeyFFlat: "v", KeyGFlat: "b", KeyAFlat: "n", KeyBFlat: "m",
		},
	}
}

func TestUpdateKeyboardBindings_ValidRequest(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "put_kb_valid")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	body := validCustomBindings()
	router := keyboardBindingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPut, "/api/note-game/keyboard-bindings", token, body))

	assert.Equal(t, http.StatusOK, w.Code, "Response body: %s", w.Body.String())

	var resp dtos.KeyboardBindingsResponse
	testutil.ParseJSONResponse(t, w, &resp)

	assert.Equal(t, userID, resp.UserID)
	assert.Equal(t, "1", resp.KeyBindings.KeyC)
	assert.Equal(t, "2", resp.KeyBindings.KeyD)
	assert.Equal(t, "q", resp.KeyBindings.KeyCSharp)
	assert.Equal(t, "z", resp.KeyBindings.KeyCFlat)
}

func TestUpdateKeyboardBindings_DuplicateKeys(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "put_kb_dup")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	body := validCustomBindings()
	// Set two notes to the same key
	body.KeyBindings.KeyD = "1" // same as KeyC

	router := keyboardBindingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPut, "/api/note-game/keyboard-bindings", token, body))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Contains(t, resp["error"], "duplicate key assignment")
}

func TestUpdateKeyboardBindings_MissingKeys(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "put_kb_missing")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testAccessToken(t, userID)

	// Send a body with empty/missing key values
	body := dtos.KeyboardBindingsRequest{
		KeyBindings: dtos.KeyBindings{
			KeyC: "a",
			// all others are zero-value (empty string) — should fail validation
		},
	}

	router := keyboardBindingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPut, "/api/note-game/keyboard-bindings", token, body))

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.NotEmpty(t, resp["error"])
}

func TestUpdateKeyboardBindings_Unauthenticated(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	body := validCustomBindings()
	// No Authorization header set
	router := keyboardBindingsTestRouter()
	w := httptest.NewRecorder()
	router.ServeHTTP(w, bearerRequest(t, http.MethodPut, "/api/note-game/keyboard-bindings", "", body))

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Unauthorized", resp["error"])
}
