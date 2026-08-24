package dtos

import (
	"context"
	"database/sql"

	"sight-reading/validations"
)

type Entry struct {
	ID             *int16         `db:"id"                json:"id"`
	TimeLength     string         `db:"time_length"       json:"time_length"`
	CreatedDate    sql.NullString `db:"created_date"`
	CreatedTime    sql.NullString `db:"created_time"`
	TotalQuestions int16          `db:"total_questions" json:"total_questions"`
	// FIXME: Valid rejects the zero value, so a game where the player got
	// nothing right cannot be saved: the POST 400s and the attempt is lost.
	// A beginner scoring 0/10 is exactly who this hits. Drop the presence
	// check and rely on the CorrectQuestions <= TotalQuestions rule.
	CorrectQuestions int16 `db:"correct_questions" json:"correct_questions"`
	// FIXME: int16 caps user ids at 32767 and ids are already in the 1500s.
	// Headroom, but finite -- widen before it matters.
	UserID int16 `db:"user_id" json:"user_id"`
	// FIXME: int8 caps notes-per-minute at 127, so any score above that fails
	// the JSON bind with a 400 and the attempt is silently lost. Reachable by
	// a fast player on a short game. Widen to int16/float64 -- note the read
	// side (NoteGameEntryResponse.NotesPerMinute) is already float64.
	NPM      int8   `db:"notes_per_minute" json:"notes_per_minute"`
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

// Valid checks a submitted score entry.
//
// TotalQuestions has no presence rule on purpose. The tag said
// `required`, but the switch that turned tag failures into messages
// spelled the case "Questions" while the field is "TotalQuestions", so
// the failure produced no message -- and when it was the only failure the
// method returned nil. Reproducing that as "no rule" keeps the behavior
// and removes the branch that could report success on a failed entry.
//
// FIXME: TotalQuestions should require a positive value. Adding it is a
// behavior change, so it is tracked separately.
func (entry Entry) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	switch {
	case entry.TimeLength == "":
		problems["time_length"] = "TimeLength: Time length is required"
	case !validations.EntryTimeLength(entry.TimeLength):
		problems["time_length"] = "TimeLength: Time must be in the 23:59:59 format (militaty time)"
	}

	// The business rule outranks the presence rule: a caller who sent more
	// correct answers than questions needs to hear that, not that a field
	// is missing.
	switch {
	case entry.CorrectQuestions > entry.TotalQuestions:
		problems["correct_questions"] = "CorrectQuestions: Correct questions cannot be more than total questions"
	case entry.CorrectQuestions == 0:
		problems["correct_questions"] = "CorrectQuestions: the amount of correct questions are required"
	}

	if entry.UserID == 0 {
		problems["user_id"] = "UserID: ID is required"
	}

	if entry.NPM == 0 {
		problems["notes_per_minute"] = "NPM: notes per minute is required"
	}

	return problems
}
