package dtos

import (
	"context"
	"encoding/json"
)

// MaxGameSettingsConfigBytes caps the JSONB payload so clients cannot
// store arbitrarily large blobs.
const MaxGameSettingsConfigBytes = 4096

// ConfigBlobProblem checks a JSONB game-config blob: present, within the
// size cap, valid JSON, and a JSON object (not a bare array/scalar). It
// returns "" when the blob is fine.
//
// Shared by the per-user game settings and the frozen assignment snapshot
// so the two can't drift.
func ConfigBlobProblem(config json.RawMessage) string {
	switch {
	case len(config) == 0:
		return "Config: is required"
	case len(config) > MaxGameSettingsConfigBytes:
		return "Config: too large"
	case !json.Valid(config):
		return "Config: must be valid JSON"
	}
	// json.Unmarshal accepts the literal `null` into a map (leaving probe
	// nil) without error, so guard it explicitly: a JSON object unmarshals
	// to a non-nil map, `null`/arrays/scalars do not.
	var probe map[string]json.RawMessage
	if err := json.Unmarshal(config, &probe); err != nil || probe == nil {
		return "Config: must be a JSON object"
	}
	return ""
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

func (r GameSettingsRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if !ValidSettingsGameTypes[r.GameType] {
		problems["game_type"] = "GameType: must be a non-note game type"
	}
	if msg := ConfigBlobProblem(r.Config); msg != "" {
		problems["config"] = msg
	}

	return problems
}
