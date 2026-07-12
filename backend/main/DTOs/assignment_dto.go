package dtos

import (
	"encoding/json"
	"errors"
	"strings"
	"time"
)

type CreateAssignmentRequest struct {
	Title    string          `json:"title"`
	GameType string          `json:"game_type"`
	Config   json.RawMessage `json:"config"`
	DueAt    *time.Time      `json:"due_at"`
	// Optional targets; nil means the teacher set none.
	TargetQuestions *int `json:"target_questions"`
	TargetAccuracy  *int `json:"target_accuracy"`
}

func (r *CreateAssignmentRequest) Validate() error {
	var errorMessages []string

	if strings.TrimSpace(r.Title) == "" {
		errorMessages = append(errorMessages, "Title: is required")
	} else if len(r.Title) > 255 {
		errorMessages = append(errorMessages, "Title: too long")
	}

	if !ValidGameTypes[r.GameType] {
		errorMessages = append(errorMessages, "GameType: must be a valid game type")
	}

	// Same shape rules as game_settings: the config is a snapshot of one.
	errorMessages = append(errorMessages, ConfigBlobErrors(r.Config)...)

	if r.TargetQuestions != nil && *r.TargetQuestions <= 0 {
		errorMessages = append(errorMessages, "TargetQuestions: must be positive")
	}
	if r.TargetAccuracy != nil && (*r.TargetAccuracy < 1 || *r.TargetAccuracy > 100) {
		errorMessages = append(errorMessages, "TargetAccuracy: must be between 1 and 100")
	}

	if len(errorMessages) > 0 {
		return errors.New(strings.Join(errorMessages, ",\n"))
	}
	return nil
}

type AssignmentResponse struct {
	ID              int             `json:"id"`
	ClassID         int             `json:"class_id"`
	Title           string          `json:"title"`
	GameType        string          `json:"game_type"`
	Config          json.RawMessage `json:"config"`
	DueAt           *time.Time      `json:"due_at"`
	TargetQuestions *int            `json:"target_questions"`
	TargetAccuracy  *int            `json:"target_accuracy"`
	CreatedAt       time.Time       `json:"created_at"`
}

// StudentAssignmentResponse is an assignment as the student sees it,
// with their own progress aggregated from tagged score entries.
type StudentAssignmentResponse struct {
	AssignmentResponse
	ClassName    string `json:"class_name"`
	AttemptCount int    `json:"attempt_count"`
	BestCorrect  int    `json:"best_correct"`
	BestAccuracy int    `json:"best_accuracy"`
}

// AssignmentResultRow is one student's row in the teacher's results
// grid; students with zero attempts still appear.
type AssignmentResultRow struct {
	StudentID     int    `json:"student_id"`
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
	AttemptCount  int    `json:"attempt_count"`
	BestCorrect   int    `json:"best_correct"`
	MostQuestions int    `json:"most_questions"`
	BestAccuracy  int    `json:"best_accuracy"`
	// Empty until the student has at least one attempt ("2006-01-02").
	LastAttemptDate string `json:"last_attempt_date"`
}

// AssignmentAttempt is one score entry tagged with the assignment, as
// shown in the teacher's per-student drill-down.
type AssignmentAttempt struct {
	CorrectQuestions int    `json:"correct_questions"`
	TotalQuestions   int    `json:"total_questions"`
	Accuracy         int    `json:"accuracy"`
	NotesPerMinute   int    `json:"notes_per_minute"`
	AttemptedDate    string `json:"attempted_date"`
	AttemptedTime    string `json:"attempted_time"`
}
