package dtos

import (
	"database/sql"
	"errors"
	"strings"

	"sight-reading/validations"

	"github.com/go-playground/validator/v10"
)

type Entry struct {
	ID             *int16         `db:"id"                json:"id"`
	TimeLength     string         `db:"time_length"       json:"time_length"       validate:"required,time"`
	CreatedDate    sql.NullString `db:"created_date"`
	CreatedTime    sql.NullString `db:"created_time"`
	TotalQuestions int16          `db:"total_questions" json:"total_questions" validate:"required,number"`
	// FIXME: `required` rejects the zero value, so a game where the player got
	// nothing right cannot be saved: the POST 400s and the attempt is lost.
	// A beginner scoring 0/10 is exactly who this hits. Use `min=0` (or drop
	// the tag and rely on the CorrectQuestions <= TotalQuestions rule below).
	CorrectQuestions int16 `db:"correct_questions" json:"correct_questions" validate:"required,number"`
	// FIXME: int16 caps user ids at 32767 and ids are already in the 1500s.
	// Headroom, but finite -- widen before it matters.
	UserID int16 `db:"user_id" json:"user_id" validate:"required,number"`
	// FIXME: int8 caps notes-per-minute at 127, so any score above that fails
	// the JSON bind with a 400 and the attempt is silently lost. Reachable by
	// a fast player on a short game. Widen to int16/float64 -- note the read
	// side (NoteGameEntryResponse.NotesPerMinute) is already float64.
	NPM      int8   `db:"notes_per_minute" json:"notes_per_minute" validate:"required,number"`
	GameType string `db:"game_type"         json:"game_type"`
	// Optional: tags this entry as an attempt at a class assignment.
	AssignmentID *int `db:"assignment_id" json:"assignment_id"`
}

// NoteGameEntryResponse represents a note game entry returned from API responses
type NoteGameEntryResponse struct {
	ID               int     `json:"id"`
	UserID           int     `json:"user_id"`
	TimeLength       string  `json:"time_length"`
	TotalQuestions   int     `json:"total_questions"`
	CorrectQuestions int     `json:"correct_questions"`
	NotesPerMinute   float64 `json:"notes_per_minute"`
	CreatedDate      string  `json:"created_date"`
}

// DailyActivityCount represents a single day's game count for the activity heatmap.
type DailyActivityCount struct {
	Date      string `json:"date"`
	GameCount int    `json:"game_count"`
}

// add an or to the hours to ensure the miliary time and nothing else

func (entry *Entry) ValidateEntry() error {
	validate := validator.New()
	err := validate.RegisterValidation("time", validations.EntryTimeLength)
	if err != nil {
		// TODO: json response
		return err
	}

	var errorMessage []string

	// Business rule checks (independent of struct validation)
	if entry.CorrectQuestions > entry.TotalQuestions {
		errorMessage = append(errorMessage, "CorrectQuestions: Correct questions cannot be more than total questions")
	}

	err = validate.Struct(entry)
	if err != nil {
		// NOTE: type asserstion
		if errs, ok := err.(validator.ValidationErrors); ok {
			for _, fieldErr := range errs {
				switch fieldErr.StructField() {

				case "TimeLength":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "TimeLength: Time length is required")
					case "time":
						errorMessage = append(errorMessage, "TimeLength: Time must be in the 23:59:59 format (militaty time)")
					}

				// FIXME: dead branch -- StructField() returns "TotalQuestions",
				// so this never matches. A TotalQuestions validation failure
				// therefore appends no message, and if it is the only failure
				// errorMessage stays empty and ValidateEntry returns nil --
				// reporting success on an entry that failed validation.
				// Rename this case to "TotalQuestions".
				case "Questions":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Questions: Question amount is required")
					case "number":
						errorMessage = append(errorMessage, "Questions: must be a number")
					}

				case "CorrectQuestions":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "CorrectQuestions: the amount of correct questions are required")
					case "number":
						errorMessage = append(errorMessage, "CorrectQuestions: must be a number")
					}

				case "UserID":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "UserID: ID is required")
					case "number":
						errorMessage = append(errorMessage, "CorrectQuestions: must be a number")
					}

				case "NPM":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "NPM: notes per minute is required")
					case "number":
						errorMessage = append(errorMessage, "NPM: must be a number")
					}
				}
			}
		}
	}
	if len(errorMessage) > 0 {
		return errors.New(strings.Join(errorMessage, ",\n"))
	}
	return nil
}
