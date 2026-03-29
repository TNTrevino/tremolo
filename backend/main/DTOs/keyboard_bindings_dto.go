package dtos

import (
	"errors"
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

type KeyboardBindingsRequest struct {
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

type KeyboardBindingsResponse struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
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

func (r *KeyboardBindingsRequest) Validate() error {
	validate := validator.New()
	err := validate.Struct(r)
	if err != nil {
		var errorMessage []string

		if errs, ok := err.(validator.ValidationErrors); ok {
			for _, fieldErr := range errs {
				switch fieldErr.StructField() {
				case "KeyC":
					errorMessage = append(errorMessage, "KeyC: is required and must be at most 20 characters")
				case "KeyD":
					errorMessage = append(errorMessage, "KeyD: is required and must be at most 20 characters")
				case "KeyE":
					errorMessage = append(errorMessage, "KeyE: is required and must be at most 20 characters")
				case "KeyF":
					errorMessage = append(errorMessage, "KeyF: is required and must be at most 20 characters")
				case "KeyG":
					errorMessage = append(errorMessage, "KeyG: is required and must be at most 20 characters")
				case "KeyA":
					errorMessage = append(errorMessage, "KeyA: is required and must be at most 20 characters")
				case "KeyB":
					errorMessage = append(errorMessage, "KeyB: is required and must be at most 20 characters")
				case "KeyCSharp":
					errorMessage = append(errorMessage, "KeyCSharp: is required and must be at most 20 characters")
				case "KeyDSharp":
					errorMessage = append(errorMessage, "KeyDSharp: is required and must be at most 20 characters")
				case "KeyESharp":
					errorMessage = append(errorMessage, "KeyESharp: is required and must be at most 20 characters")
				case "KeyFSharp":
					errorMessage = append(errorMessage, "KeyFSharp: is required and must be at most 20 characters")
				case "KeyGSharp":
					errorMessage = append(errorMessage, "KeyGSharp: is required and must be at most 20 characters")
				case "KeyASharp":
					errorMessage = append(errorMessage, "KeyASharp: is required and must be at most 20 characters")
				case "KeyBSharp":
					errorMessage = append(errorMessage, "KeyBSharp: is required and must be at most 20 characters")
				case "KeyCFlat":
					errorMessage = append(errorMessage, "KeyCFlat: is required and must be at most 20 characters")
				case "KeyDFlat":
					errorMessage = append(errorMessage, "KeyDFlat: is required and must be at most 20 characters")
				case "KeyEFlat":
					errorMessage = append(errorMessage, "KeyEFlat: is required and must be at most 20 characters")
				case "KeyFFlat":
					errorMessage = append(errorMessage, "KeyFFlat: is required and must be at most 20 characters")
				case "KeyGFlat":
					errorMessage = append(errorMessage, "KeyGFlat: is required and must be at most 20 characters")
				case "KeyAFlat":
					errorMessage = append(errorMessage, "KeyAFlat: is required and must be at most 20 characters")
				case "KeyBFlat":
					errorMessage = append(errorMessage, "KeyBFlat: is required and must be at most 20 characters")
				}
			}
		}

		if len(errorMessage) > 0 {
			return errors.New(strings.Join(errorMessage, ",\n"))
		}
	}

	seen := make(map[string]string)
	bindings := []struct {
		note  string
		value string
	}{
		{"C", r.KeyC},
		{"D", r.KeyD},
		{"E", r.KeyE},
		{"F", r.KeyF},
		{"G", r.KeyG},
		{"A", r.KeyA},
		{"B", r.KeyB},
		{"C#", r.KeyCSharp},
		{"D#", r.KeyDSharp},
		{"E#", r.KeyESharp},
		{"F#", r.KeyFSharp},
		{"G#", r.KeyGSharp},
		{"A#", r.KeyASharp},
		{"B#", r.KeyBSharp},
		{"Cb", r.KeyCFlat},
		{"Db", r.KeyDFlat},
		{"Eb", r.KeyEFlat},
		{"Fb", r.KeyFFlat},
		{"Gb", r.KeyGFlat},
		{"Ab", r.KeyAFlat},
		{"Bb", r.KeyBFlat},
	}

	for _, b := range bindings {
		if _, exists := seen[b.value]; exists {
			return fmt.Errorf("duplicate key assignment: key '%s' is assigned to multiple notes", b.value)
		}
		seen[b.value] = b.note
	}

	return nil
}
