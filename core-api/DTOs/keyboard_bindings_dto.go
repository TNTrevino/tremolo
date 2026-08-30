package dtos

import (
	"context"
	"fmt"
	"strings"
)

type KeyBindings struct {
	KeyC      string `json:"key_c"`
	KeyD      string `json:"key_d"`
	KeyE      string `json:"key_e"`
	KeyF      string `json:"key_f"`
	KeyG      string `json:"key_g"`
	KeyA      string `json:"key_a"`
	KeyB      string `json:"key_b"`
	KeyCSharp string `json:"key_c_sharp"`
	KeyDSharp string `json:"key_d_sharp"`
	KeyESharp string `json:"key_e_sharp"`
	KeyFSharp string `json:"key_f_sharp"`
	KeyGSharp string `json:"key_g_sharp"`
	KeyASharp string `json:"key_a_sharp"`
	KeyBSharp string `json:"key_b_sharp"`
	KeyCFlat  string `json:"key_c_flat"`
	KeyDFlat  string `json:"key_d_flat"`
	KeyEFlat  string `json:"key_e_flat"`
	KeyFFlat  string `json:"key_f_flat"`
	KeyGFlat  string `json:"key_g_flat"`
	KeyAFlat  string `json:"key_a_flat"`
	KeyBFlat  string `json:"key_b_flat"`
}

type KeyboardBindingsRequest struct {
	KeyBindings        KeyBindings `json:"key_bindings"`
	OverlapAccidentals bool        `json:"overlap_accidentals"`
}

type KeyboardBindingsResponse struct {
	ID                 int         `json:"id"`
	UserID             int         `json:"user_id"`
	KeyBindings        KeyBindings `json:"key_bindings"`
	OverlapAccidentals bool        `json:"overlap_accidentals"`
}

// bindingFields lists every note, its JSON field name, and its value.
// Twenty-one fields with identical rules do not deserve twenty-one copies
// of the same three lines, and the duplicate-key check needs the same
// list anyway.
func (kb KeyBindings) bindingFields() []struct {
	note  string
	key   string
	value string
} {
	return []struct {
		note  string
		key   string
		value string
	}{
		{"C", "key_c", kb.KeyC},
		{"D", "key_d", kb.KeyD},
		{"E", "key_e", kb.KeyE},
		{"F", "key_f", kb.KeyF},
		{"G", "key_g", kb.KeyG},
		{"A", "key_a", kb.KeyA},
		{"B", "key_b", kb.KeyB},
		{"C#", "key_c_sharp", kb.KeyCSharp},
		{"D#", "key_d_sharp", kb.KeyDSharp},
		{"E#", "key_e_sharp", kb.KeyESharp},
		{"F#", "key_f_sharp", kb.KeyFSharp},
		{"G#", "key_g_sharp", kb.KeyGSharp},
		{"A#", "key_a_sharp", kb.KeyASharp},
		{"B#", "key_b_sharp", kb.KeyBSharp},
		{"Cb", "key_c_flat", kb.KeyCFlat},
		{"Db", "key_d_flat", kb.KeyDFlat},
		{"Eb", "key_e_flat", kb.KeyEFlat},
		{"Fb", "key_f_flat", kb.KeyFFlat},
		{"Gb", "key_g_flat", kb.KeyGFlat},
		{"Ab", "key_a_flat", kb.KeyAFlat},
		{"Bb", "key_b_flat", kb.KeyBFlat},
	}
}

// goFieldName turns a JSON key like "key_c_sharp" back into the Go field
// name "KeyCSharp". The messages name the Go field, which is what the
// tag-driven version reported.
func goFieldName(jsonKey string) string {
	var out strings.Builder
	for part := range strings.SplitSeq(jsonKey, "_") {
		out.WriteString(strings.ToUpper(part[:1]) + part[1:])
	}
	return out.String()
}

func (r KeyboardBindingsRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	fields := r.KeyBindings.bindingFields()
	for _, f := range fields {
		switch {
		case f.value == "":
			problems[f.key] = fmt.Sprintf("%s: is required", goFieldName(f.key))
		case len(f.value) > 20:
			problems[f.key] = fmt.Sprintf("%s: must be at most 20 characters", goFieldName(f.key))
		}
	}

	// The duplicate check only runs on a fully populated set. Two empty
	// keys are not a duplicate assignment, they are two missing fields,
	// and reporting both would bury the real problem.
	if len(problems) > 0 {
		return problems
	}

	seen := map[string]string{}
	for _, f := range fields {
		if _, exists := seen[f.value]; exists {
			problems["key_bindings"] = fmt.Sprintf("duplicate key assignment: key '%s' is assigned to multiple notes", f.value)
			return problems
		}
		seen[f.value] = f.note
	}

	return problems
}
