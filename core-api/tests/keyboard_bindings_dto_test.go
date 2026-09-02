package tests

import (
	"context"
	"strings"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/services"

	"github.com/stretchr/testify/assert"
)

// --- Valid() happy path tests ---

func TestKeyboardBindingsValidation_DefaultBindingsPass(t *testing.T) {
	t.Parallel()

	req := dtos.KeyboardBindingsRequest{
		KeyBindings: services.DefaultKeyboardBindings,
	}

	assert.Empty(t, req.Valid(context.Background()))
}

func TestKeyboardBindingsValidation_SingleCharKeys(t *testing.T) {
	t.Parallel()

	req := dtos.KeyboardBindingsRequest{
		KeyBindings: dtos.KeyBindings{
			KeyC: "a", KeyD: "b", KeyE: "c", KeyF: "d", KeyG: "e", KeyA: "f", KeyB: "g",
			KeyCSharp: "h", KeyDSharp: "i", KeyESharp: "j", KeyFSharp: "k", KeyGSharp: "l", KeyASharp: "m", KeyBSharp: "n",
			KeyCFlat: "o", KeyDFlat: "p", KeyEFlat: "q", KeyFFlat: "r", KeyGFlat: "s", KeyAFlat: "t", KeyBFlat: "u",
		},
	}

	assert.Empty(t, req.Valid(context.Background()))
}

func TestKeyboardBindingsValidation_MaxLengthKeys(t *testing.T) {
	t.Parallel()

	// Generate 21 unique strings of exactly 20 characters each.
	keys := make([]string, 21)
	for i := range keys {
		keys[i] = strings.Repeat("k", 19) + string(rune('a'+i))
	}

	req := dtos.KeyboardBindingsRequest{
		KeyBindings: dtos.KeyBindings{
			KeyC: keys[0], KeyD: keys[1], KeyE: keys[2], KeyF: keys[3], KeyG: keys[4], KeyA: keys[5], KeyB: keys[6],
			KeyCSharp: keys[7], KeyDSharp: keys[8], KeyESharp: keys[9], KeyFSharp: keys[10], KeyGSharp: keys[11], KeyASharp: keys[12], KeyBSharp: keys[13],
			KeyCFlat: keys[14], KeyDFlat: keys[15], KeyEFlat: keys[16], KeyFFlat: keys[17], KeyGFlat: keys[18], KeyAFlat: keys[19], KeyBFlat: keys[20],
		},
	}

	assert.Empty(t, req.Valid(context.Background()))
}

func TestKeyboardBindingsValidation_NumericKeys(t *testing.T) {
	t.Parallel()

	req := dtos.KeyboardBindingsRequest{
		KeyBindings: dtos.KeyBindings{
			KeyC: "1", KeyD: "2", KeyE: "3", KeyF: "4", KeyG: "5", KeyA: "6", KeyB: "7",
			KeyCSharp: "8", KeyDSharp: "9", KeyESharp: "10", KeyFSharp: "11", KeyGSharp: "12", KeyASharp: "13", KeyBSharp: "14",
			KeyCFlat: "15", KeyDFlat: "16", KeyEFlat: "17", KeyFFlat: "18", KeyGFlat: "19", KeyAFlat: "20", KeyBFlat: "21",
		},
	}

	assert.Empty(t, req.Valid(context.Background()))
}

// --- Valid() error path tests ---

func TestKeyboardBindingsValidation_EmptyRequiredKey(t *testing.T) {
	t.Parallel()

	// Start from valid defaults and blank out KeyC.
	kb := services.DefaultKeyboardBindings
	kb.KeyC = ""

	req := dtos.KeyboardBindingsRequest{KeyBindings: kb}

	problems := req.Valid(context.Background())
	assert.Contains(t, problems["key_c"], "KeyC")
}

func TestKeyboardBindingsValidation_KeyExceedsMaxLength(t *testing.T) {
	t.Parallel()

	kb := services.DefaultKeyboardBindings
	kb.KeyD = strings.Repeat("x", 21) // 21 chars, exceeds max=20

	req := dtos.KeyboardBindingsRequest{KeyBindings: kb}

	problems := req.Valid(context.Background())
	assert.Contains(t, problems["key_d"], "KeyD")
}

func TestKeyboardBindingsValidation_DuplicateKeyAssignment(t *testing.T) {
	t.Parallel()

	kb := services.DefaultKeyboardBindings
	kb.KeyD = kb.KeyC // duplicate: both map to "a"

	req := dtos.KeyboardBindingsRequest{KeyBindings: kb}

	problems := req.Valid(context.Background())
	assert.Contains(t, problems["key_bindings"], "duplicate key assignment")
}

func TestKeyboardBindingsValidation_MultipleEmptyKeys(t *testing.T) {
	t.Parallel()

	kb := services.DefaultKeyboardBindings
	kb.KeyC = ""
	kb.KeyA = ""
	kb.KeyGSharp = ""

	req := dtos.KeyboardBindingsRequest{KeyBindings: kb}

	problems := req.Valid(context.Background())
	assert.Contains(t, problems["key_c"], "KeyC")
	assert.Contains(t, problems["key_a"], "KeyA")
	assert.Contains(t, problems["key_g_sharp"], "KeyGSharp")
}
