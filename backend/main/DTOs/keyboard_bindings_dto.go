package dtos

import (
	"errors"
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

type KeyBindings struct {
	KeyC      string `json:"key_c"       validate:"required,max=20"`
	KeyD      string `json:"key_d"       validate:"required,max=20"`
	KeyE      string `json:"key_e"       validate:"required,max=20"`
	KeyF      string `json:"key_f"       validate:"required,max=20"`
	KeyG      string `json:"key_g"       validate:"required,max=20"`
	KeyA      string `json:"key_a"       validate:"required,max=20"`
	KeyB      string `json:"key_b"       validate:"required,max=20"`
	KeyCSharp string `json:"key_c_sharp" validate:"required,max=20"`
	KeyDSharp string `json:"key_d_sharp" validate:"required,max=20"`
	KeyESharp string `json:"key_e_sharp" validate:"required,max=20"`
	KeyFSharp string `json:"key_f_sharp" validate:"required,max=20"`
	KeyGSharp string `json:"key_g_sharp" validate:"required,max=20"`
	KeyASharp string `json:"key_a_sharp" validate:"required,max=20"`
	KeyBSharp string `json:"key_b_sharp" validate:"required,max=20"`
	KeyCFlat  string `json:"key_c_flat"  validate:"required,max=20"`
	KeyDFlat  string `json:"key_d_flat"  validate:"required,max=20"`
	KeyEFlat  string `json:"key_e_flat"  validate:"required,max=20"`
	KeyFFlat  string `json:"key_f_flat"  validate:"required,max=20"`
	KeyGFlat  string `json:"key_g_flat"  validate:"required,max=20"`
	KeyAFlat  string `json:"key_a_flat"  validate:"required,max=20"`
	KeyBFlat  string `json:"key_b_flat"  validate:"required,max=20"`
}

type KeyboardBindingsRequest struct {
	KeyBindings KeyBindings `json:"key_bindings" validate:"required"`
}

type KeyboardBindingsResponse struct {
	ID          int         `json:"id"`
	UserID      int         `json:"user_id"`
	KeyBindings KeyBindings `json:"key_bindings"`
}

func (r *KeyboardBindingsRequest) Validate() error {
	validate := validator.New()
	err := validate.Struct(r)
	if err != nil {
		errs, ok := err.(validator.ValidationErrors)
		if !ok {
			return err
		}
		var errorMessages []string
		for _, fieldErr := range errs {
			errorMessages = append(errorMessages, fmt.Sprintf("%s: is required and must be at most 20 characters", fieldErr.StructField()))
		}
		if len(errorMessages) > 0 {
			return errors.New(strings.Join(errorMessages, ",\n"))
		}
		return err
	}

	kb := r.KeyBindings
	seen := make(map[string]string)
	bindings := []struct {
		note  string
		value string
	}{
		{"C", kb.KeyC},
		{"D", kb.KeyD},
		{"E", kb.KeyE},
		{"F", kb.KeyF},
		{"G", kb.KeyG},
		{"A", kb.KeyA},
		{"B", kb.KeyB},
		{"C#", kb.KeyCSharp},
		{"D#", kb.KeyDSharp},
		{"E#", kb.KeyESharp},
		{"F#", kb.KeyFSharp},
		{"G#", kb.KeyGSharp},
		{"A#", kb.KeyASharp},
		{"B#", kb.KeyBSharp},
		{"Cb", kb.KeyCFlat},
		{"Db", kb.KeyDFlat},
		{"Eb", kb.KeyEFlat},
		{"Fb", kb.KeyFFlat},
		{"Gb", kb.KeyGFlat},
		{"Ab", kb.KeyAFlat},
		{"Bb", kb.KeyBFlat},
	}

	for _, b := range bindings {
		if _, exists := seen[b.value]; exists {
			return fmt.Errorf("duplicate key assignment: key '%s' is assigned to multiple notes", b.value)
		}
		seen[b.value] = b.note
	}

	return nil
}
