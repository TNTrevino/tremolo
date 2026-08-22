package dtos

import (
	"errors"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
)

type NoteGameSettingsRequest struct {
	GameMode  string `json:"game_mode"  validate:"required,oneof=time notes"`
	TimeLimit int    `json:"time_limit" validate:"required,oneof=15 30 60 120"`
	NoteLimit int    `json:"note_limit" validate:"required,oneof=10 25 50 100"`
	Scale     string `json:"scale"      validate:"required"`
	Octave    int    `json:"octave"     validate:"required,min=1,max=9"`
	LowNote   string `json:"low_note"   validate:"required,natural_note"`
	HighNote  string `json:"high_note"  validate:"required,natural_note"`
	Clef      string `json:"clef"       validate:"required,oneof=treble bass"`
}

type NoteGameSettingsResponse struct {
	ID        int    `json:"id"`
	UserID    int    `json:"user_id"`
	GameMode  string `json:"game_mode"`
	TimeLimit int    `json:"time_limit"`
	NoteLimit int    `json:"note_limit"`
	Scale     string `json:"scale"`
	Octave    int    `json:"octave"`
	LowNote   string `json:"low_note"`
	HighNote  string `json:"high_note"`
	Clef      string `json:"clef"`
}

// naturalNote matches range endpoints like "C4" or "F3" (no accidentals).
var naturalNote = regexp.MustCompile(`^[A-G][0-9]$`)

func (r *NoteGameSettingsRequest) Validate() error {
	validate := validator.New()
	_ = validate.RegisterValidation(
		"natural_note",
		func(fl validator.FieldLevel) bool {
			return naturalNote.MatchString(fl.Field().String())
		},
	)
	err := validate.Struct(r)
	if err != nil {
		var errorMessage []string

		if errs, ok := err.(validator.ValidationErrors); ok {
			for _, fieldErr := range errs {
				switch fieldErr.StructField() {
				case "GameMode":
					errorMessage = append(errorMessage, "GameMode: must be 'time' or 'notes'")
				case "TimeLimit":
					errorMessage = append(errorMessage, "TimeLimit: must be 15, 30, 60, or 120")
				case "NoteLimit":
					errorMessage = append(errorMessage, "NoteLimit: must be 10, 25, 50, or 100")
				case "Scale":
					errorMessage = append(errorMessage, "Scale: is required")
				case "Octave":
					errorMessage = append(errorMessage, "Octave: must be between 1 and 9")
				case "LowNote":
					errorMessage = append(errorMessage, "LowNote: must be a natural note like C4")
				case "HighNote":
					errorMessage = append(errorMessage, "HighNote: must be a natural note like C4")
				case "Clef":
					errorMessage = append(errorMessage, "Clef: must be 'treble' or 'bass'")
				}
			}
		}

		if len(errorMessage) > 0 {
			return errors.New(strings.Join(errorMessage, ",\n"))
		}
	}
	return nil
}
