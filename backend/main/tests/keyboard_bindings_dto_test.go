package tests

import (
	"strings"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/services"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --- Task 6: Happy paths ---

func TestKeyboardBindingsValidation_DefaultBindingsPass(t *testing.T) {
	t.Parallel()

	req := &dtos.KeyboardBindingsRequest{
		KeyBindings: services.DEFAULT_KEYBOARD_BINDINGS,
	}

	err := req.Validate()
	require.NoError(t, err)
}

func TestKeyboardBindingsValidation_SingleCharKeys(t *testing.T) {
	t.Parallel()

	req := &dtos.KeyboardBindingsRequest{
		KeyBindings: dtos.KeyBindings{
			KeyC: "a", KeyD: "b", KeyE: "c", KeyF: "d", KeyG: "e", KeyA: "f", KeyB: "g",
			KeyCSharp: "h", KeyDSharp: "i", KeyESharp: "j", KeyFSharp: "k", KeyGSharp: "l", KeyASharp: "m", KeyBSharp: "n",
			KeyCFlat: "o", KeyDFlat: "p", KeyEFlat: "q", KeyFFlat: "r", KeyGFlat: "s", KeyAFlat: "t", KeyBFlat: "u",
		},
	}

	err := req.Validate()
	require.NoError(t, err)
}

func TestKeyboardBindingsValidation_MaxLengthKeys(t *testing.T) {
	t.Parallel()

	// Generate 21 unique strings of exactly 20 characters each.
	keys := make([]string, 21)
	for i := range keys {
		keys[i] = strings.Repeat("k", 19) + string(rune('a'+i))
	}

	req := &dtos.KeyboardBindingsRequest{
		KeyBindings: dtos.KeyBindings{
			KeyC: keys[0], KeyD: keys[1], KeyE: keys[2], KeyF: keys[3], KeyG: keys[4], KeyA: keys[5], KeyB: keys[6],
			KeyCSharp: keys[7], KeyDSharp: keys[8], KeyESharp: keys[9], KeyFSharp: keys[10], KeyGSharp: keys[11], KeyASharp: keys[12], KeyBSharp: keys[13],
			KeyCFlat: keys[14], KeyDFlat: keys[15], KeyEFlat: keys[16], KeyFFlat: keys[17], KeyGFlat: keys[18], KeyAFlat: keys[19], KeyBFlat: keys[20],
		},
	}

	err := req.Validate()
	require.NoError(t, err)
}

func TestKeyboardBindingsValidation_NumericKeys(t *testing.T) {
	t.Parallel()

	req := &dtos.KeyboardBindingsRequest{
		KeyBindings: dtos.KeyBindings{
			KeyC: "1", KeyD: "2", KeyE: "3", KeyF: "4", KeyG: "5", KeyA: "6", KeyB: "7",
			KeyCSharp: "8", KeyDSharp: "9", KeyESharp: "10", KeyFSharp: "11", KeyGSharp: "12", KeyASharp: "13", KeyBSharp: "14",
			KeyCFlat: "15", KeyDFlat: "16", KeyEFlat: "17", KeyFFlat: "18", KeyGFlat: "19", KeyAFlat: "20", KeyBFlat: "21",
		},
	}

	err := req.Validate()
	require.NoError(t, err)
}

// --- Task 7: Error paths ---

func TestKeyboardBindingsValidation_EmptyRequiredKey(t *testing.T) {
	t.Parallel()

	// Start from valid defaults and blank out KeyC.
	kb := services.DEFAULT_KEYBOARD_BINDINGS
	kb.KeyC = ""

	req := &dtos.KeyboardBindingsRequest{KeyBindings: kb}

	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "KeyC")
}

func TestKeyboardBindingsValidation_KeyExceedsMaxLength(t *testing.T) {
	t.Parallel()

	kb := services.DEFAULT_KEYBOARD_BINDINGS
	kb.KeyD = strings.Repeat("x", 21) // 21 chars, exceeds max=20

	req := &dtos.KeyboardBindingsRequest{KeyBindings: kb}

	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "KeyD")
}

func TestKeyboardBindingsValidation_DuplicateKeyAssignment(t *testing.T) {
	t.Parallel()

	kb := services.DEFAULT_KEYBOARD_BINDINGS
	kb.KeyD = kb.KeyC // duplicate: both map to "a"

	req := &dtos.KeyboardBindingsRequest{KeyBindings: kb}

	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "duplicate key assignment")
}

func TestKeyboardBindingsValidation_MultipleEmptyKeys(t *testing.T) {
	t.Parallel()

	kb := services.DEFAULT_KEYBOARD_BINDINGS
	kb.KeyC = ""
	kb.KeyA = ""
	kb.KeyGSharp = ""

	req := &dtos.KeyboardBindingsRequest{KeyBindings: kb}

	err := req.Validate()
	require.Error(t, err)
	assert.Contains(t, err.Error(), "KeyC")
	assert.Contains(t, err.Error(), "KeyA")
	assert.Contains(t, err.Error(), "KeyGSharp")
}
