package tests

import (
	"context"
	"net/http"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/controllers"
	"sight-reading/database"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------- GET /api/note-game/keyboard-bindings ----------

func TestGetKeyboardBindings_Authenticated_WithBindings(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "get_kb_with")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	c, w := testutil.CreateGinContextWithUserID(http.MethodGet, "/api/note-game/keyboard-bindings", userID)
	controllers.GetKeyboardBindings(c)

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

	// Delete the auto-seeded bindings so we can test the 404 path
	err := database.Queries.DeleteKeyboardBindings(context.Background(), int32(userID))
	require.NoError(t, err, "failed to delete seeded keyboard bindings")

	c, w := testutil.CreateGinContextWithUserID(http.MethodGet, "/api/note-game/keyboard-bindings", userID)
	controllers.GetKeyboardBindings(c)

	assert.Equal(t, http.StatusNotFound, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "No keyboard bindings found", resp["error"])
}

func TestGetKeyboardBindings_Unauthenticated(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	// No userID set in context
	c, w := testutil.CreateGinContext(http.MethodGet, "/api/note-game/keyboard-bindings")
	controllers.GetKeyboardBindings(c)

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

	body := validCustomBindings()
	c, w := testutil.CreateGinContextWithBody(http.MethodPut, "/api/note-game/keyboard-bindings", body)
	c.Set("userID", userID)

	controllers.UpdateKeyboardBindings(c)

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

	body := validCustomBindings()
	// Set two notes to the same key
	body.KeyBindings.KeyD = "1" // same as KeyC
	c, w := testutil.CreateGinContextWithBody(http.MethodPut, "/api/note-game/keyboard-bindings", body)
	c.Set("userID", userID)

	controllers.UpdateKeyboardBindings(c)

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

	// Send a body with empty/missing key values
	body := dtos.KeyboardBindingsRequest{
		KeyBindings: dtos.KeyBindings{
			KeyC: "a",
			// all others are zero-value (empty string) — should fail validation
		},
	}
	c, w := testutil.CreateGinContextWithBody(http.MethodPut, "/api/note-game/keyboard-bindings", body)
	c.Set("userID", userID)

	controllers.UpdateKeyboardBindings(c)

	assert.Equal(t, http.StatusBadRequest, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.NotEmpty(t, resp["error"])
}

func TestUpdateKeyboardBindings_Unauthenticated(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	body := validCustomBindings()
	// No userID set in context
	c, w := testutil.CreateGinContextWithBody(http.MethodPut, "/api/note-game/keyboard-bindings", body)

	controllers.UpdateKeyboardBindings(c)

	assert.Equal(t, http.StatusUnauthorized, w.Code, "Response body: %s", w.Body.String())

	var resp map[string]any
	testutil.ParseJSONResponse(t, w, &resp)
	assert.Equal(t, "Unauthorized", resp["error"])
}
