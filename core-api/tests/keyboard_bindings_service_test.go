package tests

import (
	"context"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// CreateDefaultKeyboardBindings tests
// ---------------------------------------------------------------------------

// TestKeyboardBindings_CreateDefault_SeedsAllKeys verifies that
// CreateDefaultKeyboardBindings populates all 21 key bindings with the values
// defined in DefaultKeyboardBindings.
func TestKeyboardBindings_CreateDefault_SeedsAllKeys(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "kb_create_default")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// CreateTestUserWithDefaults already calls CreateDefaultKeyboardBindings,
	// so we can immediately read the bindings back.
	resp, err := services.GetKeyboardBindings(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, resp, "Expected non-nil bindings after seeding defaults")

	assert.Equal(t, userID, resp.UserID)
	assert.Greater(t, resp.ID, 0)

	expected := services.DefaultKeyboardBindings
	kb := resp.KeyBindings

	assert.Equal(t, expected.KeyC, kb.KeyC)
	assert.Equal(t, expected.KeyD, kb.KeyD)
	assert.Equal(t, expected.KeyE, kb.KeyE)
	assert.Equal(t, expected.KeyF, kb.KeyF)
	assert.Equal(t, expected.KeyG, kb.KeyG)
	assert.Equal(t, expected.KeyA, kb.KeyA)
	assert.Equal(t, expected.KeyB, kb.KeyB)
	assert.Equal(t, expected.KeyCSharp, kb.KeyCSharp)
	assert.Equal(t, expected.KeyDSharp, kb.KeyDSharp)
	assert.Equal(t, expected.KeyESharp, kb.KeyESharp)
	assert.Equal(t, expected.KeyFSharp, kb.KeyFSharp)
	assert.Equal(t, expected.KeyGSharp, kb.KeyGSharp)
	assert.Equal(t, expected.KeyASharp, kb.KeyASharp)
	assert.Equal(t, expected.KeyBSharp, kb.KeyBSharp)
	assert.Equal(t, expected.KeyCFlat, kb.KeyCFlat)
	assert.Equal(t, expected.KeyDFlat, kb.KeyDFlat)
	assert.Equal(t, expected.KeyEFlat, kb.KeyEFlat)
	assert.Equal(t, expected.KeyFFlat, kb.KeyFFlat)
	assert.Equal(t, expected.KeyGFlat, kb.KeyGFlat)
	assert.Equal(t, expected.KeyAFlat, kb.KeyAFlat)
	assert.Equal(t, expected.KeyBFlat, kb.KeyBFlat)
}

// TestKeyboardBindings_CreateDefault_Idempotent verifies that calling
// CreateDefaultKeyboardBindings twice on the same user does not error and
// leaves the bindings unchanged.
func TestKeyboardBindings_CreateDefault_Idempotent(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "kb_idempotent")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// First call already happened inside CreateTestUserWithDefaults.
	// Fetch the bindings so we can compare after the second call.
	before, err := services.GetKeyboardBindings(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, before)

	// Second call — should not error.
	err = services.CreateDefaultKeyboardBindings(context.Background(), database.Queries, userID)
	require.NoError(t, err)

	after, err := services.GetKeyboardBindings(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, after)

	// Bindings should be identical (same ID, same values).
	assert.Equal(t, before.ID, after.ID)
	assert.Equal(t, before.KeyBindings, after.KeyBindings)
}

// ---------------------------------------------------------------------------
// GetKeyboardBindings tests
// ---------------------------------------------------------------------------

// TestKeyboardBindings_Get_WithBindings verifies that GetKeyboardBindings
// returns the correct data for a user who has bindings.
func TestKeyboardBindings_Get_WithBindings(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "kb_get_with")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	resp, err := services.GetKeyboardBindings(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, resp)

	assert.Equal(t, userID, resp.UserID)
	assert.Greater(t, resp.ID, 0)
	// Spot-check a few values against defaults.
	assert.Equal(t, "a", resp.KeyBindings.KeyC)
	assert.Equal(t, "q", resp.KeyBindings.KeyCSharp)
	assert.Equal(t, "z", resp.KeyBindings.KeyCFlat)
}

// TestKeyboardBindings_Get_NoBindings verifies that GetKeyboardBindings
// returns (nil, nil) when the user has no keyboard bindings row.
func TestKeyboardBindings_Get_NoBindings(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "kb_get_none")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Delete the bindings that were auto-seeded by CreateTestUserWithDefaults.
	err := database.Queries.DeleteKeyboardBindings(context.Background(), int32(userID))
	require.NoError(t, err)

	resp, err := services.GetKeyboardBindings(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	assert.Nil(t, resp, "Expected nil response for user without bindings")
}

// TestKeyboardBindings_Get_InvalidUserID verifies that GetKeyboardBindings
// returns (nil, nil) for a user ID that does not exist in the database.
func TestKeyboardBindings_Get_InvalidUserID(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	resp, err := services.GetKeyboardBindings(context.Background(), database.Queries, 999999999)
	require.NoError(t, err)
	assert.Nil(t, resp)
}

// ---------------------------------------------------------------------------
// UpsertKeyboardBindings tests
// ---------------------------------------------------------------------------

// TestKeyboardBindings_Upsert_Insert verifies inserting fresh custom bindings
// for a user who has no existing row.
func TestKeyboardBindings_Upsert_Insert(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "kb_upsert_insert")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// Remove auto-seeded bindings so we can test a true insert path.
	err := database.Queries.DeleteKeyboardBindings(context.Background(), int32(userID))
	require.NoError(t, err)

	custom := &dtos.KeyboardBindingsRequest{
		KeyBindings: dtos.KeyBindings{
			KeyC: "1", KeyD: "2", KeyE: "3", KeyF: "4", KeyG: "5", KeyA: "6", KeyB: "7",
			KeyCSharp: "8", KeyDSharp: "9", KeyESharp: "0", KeyFSharp: "-", KeyGSharp: "=", KeyASharp: "[", KeyBSharp: "]",
			KeyCFlat: "!", KeyDFlat: "@", KeyEFlat: "#", KeyFFlat: "$", KeyGFlat: "%", KeyAFlat: "^", KeyBFlat: "&",
		},
	}

	resp, err := services.UpsertKeyboardBindings(context.Background(), database.Queries, userID, custom)
	require.NoError(t, err)
	require.NotNil(t, resp)

	assert.Equal(t, userID, resp.UserID)
	assert.Greater(t, resp.ID, 0)
	assert.Equal(t, custom.KeyBindings, resp.KeyBindings)
}

// TestKeyboardBindings_Upsert_Update verifies updating existing bindings
// changes the stored values.
func TestKeyboardBindings_Upsert_Update(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "kb_upsert_update")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	// User already has default bindings. Upsert with different values.
	updated := &dtos.KeyboardBindingsRequest{
		KeyBindings: dtos.KeyBindings{
			KeyC: "1", KeyD: "2", KeyE: "3", KeyF: "4", KeyG: "5", KeyA: "6", KeyB: "7",
			KeyCSharp: "8", KeyDSharp: "9", KeyESharp: "0", KeyFSharp: "-", KeyGSharp: "=", KeyASharp: "[", KeyBSharp: "]",
			KeyCFlat: "!", KeyDFlat: "@", KeyEFlat: "#", KeyFFlat: "$", KeyGFlat: "%", KeyAFlat: "^", KeyBFlat: "&",
		},
	}

	resp, err := services.UpsertKeyboardBindings(context.Background(), database.Queries, userID, updated)
	require.NoError(t, err)
	require.NotNil(t, resp)

	assert.Equal(t, userID, resp.UserID)
	assert.Equal(t, updated.KeyBindings, resp.KeyBindings)

	// Verify via a fresh read.
	fetched, err := services.GetKeyboardBindings(context.Background(), database.Queries, userID)
	require.NoError(t, err)
	require.NotNil(t, fetched)
	assert.Equal(t, updated.KeyBindings, fetched.KeyBindings)
}
