package dtos

import (
	"encoding/json"
	"errors"
	"strings"
)

// MaxGameSettingsConfigBytes caps the JSONB payload so clients cannot
// store arbitrarily large blobs.
const MaxGameSettingsConfigBytes = 4096

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

	if len(r.Config) == 0 {
		errorMessages = append(errorMessages, "Config: is required")
	} else if len(r.Config) > MaxGameSettingsConfigBytes {
		errorMessages = append(errorMessages, "Config: too large")
	} else if !json.Valid(r.Config) {
		errorMessages = append(errorMessages, "Config: must be valid JSON")
	} else {
		// Must be a JSON object, not a bare array/scalar
		var probe map[string]json.RawMessage
		if err := json.Unmarshal(r.Config, &probe); err != nil {
			errorMessages = append(errorMessages, "Config: must be a JSON object")
		}
	}

	if len(errorMessages) > 0 {
		return errors.New(strings.Join(errorMessages, ",\n"))
	}
	return nil
}
