package dtos

import (
	"encoding/json"
	"errors"
	"strings"
)

// MaxGameSettingsConfigBytes caps the JSONB payload so clients cannot
// store arbitrarily large blobs.
const MaxGameSettingsConfigBytes = 4096

// ConfigBlobErrors validates a JSONB game-config blob: present, within
// the size cap, valid JSON, and a JSON object (not a bare array/scalar).
// Shared by the per-user game settings and the frozen assignment
// snapshot so the two can't drift. Returns field-prefixed messages to
// append to a caller's error list.
func ConfigBlobErrors(config json.RawMessage) []string {
	switch {
	case len(config) == 0:
		return []string{"Config: is required"}
	case len(config) > MaxGameSettingsConfigBytes:
		return []string{"Config: too large"}
	case !json.Valid(config):
		return []string{"Config: must be valid JSON"}
	}
	var probe map[string]json.RawMessage
	if err := json.Unmarshal(config, &probe); err != nil {
		return []string{"Config: must be a JSON object"}
	}
	return nil
}

type GameSettingsRequest struct {
	GameType string          `json:"game_type"`
	Config   json.RawMessage `json:"config"`
}

type GameSettingsResponse struct {
	ID       int             `json:"id"`
	UserID   int             `json:"user_id"`
	GameType string          `json:"game_type"`
	Config   json.RawMessage `json:"config"`
}

func (r *GameSettingsRequest) Validate() error {
	var errorMessages []string

	if !ValidSettingsGameTypes[r.GameType] {
		errorMessages = append(errorMessages, "GameType: must be a non-note game type")
	}

	errorMessages = append(errorMessages, ConfigBlobErrors(r.Config)...)

	if len(errorMessages) > 0 {
		return errors.New(strings.Join(errorMessages, ",\n"))
	}
	return nil
}
