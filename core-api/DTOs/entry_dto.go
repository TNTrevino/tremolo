package dtos

import (
	"context"
	"database/sql"

	"sight-reading/validations"
)

type Entry struct {
	ID               *int16         `db:"id"                json:"id"`
	TimeLength       string         `db:"time_length"       json:"time_length"`
	CreatedDate      sql.NullString `db:"created_date"`
	CreatedTime      sql.NullString `db:"created_time"`
	TotalQuestions   int16          `db:"total_questions" json:"total_questions"`
	CorrectQuestions int16          `db:"correct_questions" json:"correct_questions"`
	UserID           int64          `db:"user_id" json:"user_id"`
	NPM              float64        `db:"notes_per_minute" json:"notes_per_minute"`
	GameType         string         `db:"game_type"         json:"game_type"`
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
func (entry Entry) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	switch {
	case entry.TimeLength == "":
		problems["time_length"] = "TimeLength: Time length is required"
	case !validations.EntryTimeLength(entry.TimeLength):
		problems["time_length"] = "TimeLength: Time must be in the 23:59:59 format (militaty time)"
	}

	if entry.TotalQuestions <= 0 {
		problems["total_questions"] = "TotalQuestions: Total questions must be greater than zero"
	}

	if entry.CorrectQuestions > entry.TotalQuestions {
		problems["correct_questions"] = "CorrectQuestions: Correct questions cannot be more than total questions"
	}

	if entry.UserID == 0 {
		problems["user_id"] = "UserID: ID is required"
	}

	// NPM is a float64 with no upper bound the JSON decoder enforces (the
	// int8 column it used to be gave that for free). World-class
	// instrumentalists top out far below 1000 notes per minute, so the
	// cap rejects nothing a human can produce, while keeping every
	// accepted value far inside int32 range -- the
	// int32(math.Round(entry.NPM)) conversion in
	// services.CreateNoteGameEntry is implementation-defined for a value
	// outside that range.
	switch {
	case entry.NPM < 0:
		problems["notes_per_minute"] = "NPM: notes per minute cannot be negative"
	case entry.NPM > 1000:
		problems["notes_per_minute"] = "NPM: notes per minute cannot exceed 1000"
	}

	return problems
}
