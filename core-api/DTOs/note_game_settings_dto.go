package dtos

import (
	"context"
	"regexp"
)

type NoteGameSettingsRequest struct {
	GameMode  string `json:"game_mode"`
	TimeLimit int    `json:"time_limit"`
	NoteLimit int    `json:"note_limit"`
	Scale     string `json:"scale"`
	Octave    int    `json:"octave"`
	LowNote   string `json:"low_note"`
	HighNote  string `json:"high_note"`
	Clef      string `json:"clef"`
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

var (
	validGameModes  = map[string]bool{"time": true, "notes": true}
	validTimeLimits = map[int]bool{15: true, 30: true, 60: true, 120: true}
	validNoteLimits = map[int]bool{10: true, 25: true, 50: true, 100: true}
	validClefs      = map[string]bool{"treble": true, "bass": true}
)

func (r NoteGameSettingsRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if !validGameModes[r.GameMode] {
		problems["game_mode"] = "GameMode: must be 'time' or 'notes'"
	}
	if !validTimeLimits[r.TimeLimit] {
		problems["time_limit"] = "TimeLimit: must be 15, 30, 60, or 120"
	}
	if !validNoteLimits[r.NoteLimit] {
		problems["note_limit"] = "NoteLimit: must be 10, 25, 50, or 100"
	}
	if r.Scale == "" {
		problems["scale"] = "Scale: is required"
	}
	if r.Octave < 1 || r.Octave > 9 {
		problems["octave"] = "Octave: must be between 1 and 9"
	}
	if !naturalNote.MatchString(r.LowNote) {
		problems["low_note"] = "LowNote: must be a natural note like C4"
	}
	if !naturalNote.MatchString(r.HighNote) {
		problems["high_note"] = "HighNote: must be a natural note like C4"
	}
	if !validClefs[r.Clef] {
		problems["clef"] = "Clef: must be 'treble' or 'bass'"
	}

	return problems
}
