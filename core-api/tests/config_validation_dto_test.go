package tests

import (
	"context"
	"encoding/json"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
)

// The JSON literal `null` unmarshals into a map target without error, so
// it slipped past the "must be a JSON object" probe. A null config is
// neither an object nor handled downstream as one, and it would get
// persisted as a game-settings row or a frozen assignment snapshot.

func TestConfigBlobProblem_RejectsNull(t *testing.T) {
	t.Parallel()

	assert.NotEmpty(t, dtos.ConfigBlobProblem(json.RawMessage("null")), "a literal null config must be rejected")
}

func TestConfigBlobProblem_RejectsBareArrayAndScalar(t *testing.T) {
	t.Parallel()

	assert.NotEmpty(t, dtos.ConfigBlobProblem(json.RawMessage("[]")), "bare array rejected")
	assert.NotEmpty(t, dtos.ConfigBlobProblem(json.RawMessage("5")), "bare scalar rejected")
}

func TestConfigBlobProblem_AcceptsObject(t *testing.T) {
	t.Parallel()

	assert.Empty(t, dtos.ConfigBlobProblem(json.RawMessage(`{"scale":"C"}`)), "a JSON object is valid")
}

func TestCreateAssignmentValid_RejectsNullConfig(t *testing.T) {
	t.Parallel()

	req := dtos.CreateAssignmentRequest{
		Title:    "Week 1",
		GameType: "note",
		Config:   json.RawMessage("null"),
	}

	problems := req.Valid(context.Background())

	assert.Contains(t, problems["config"], "Config")
}

func TestGameSettingsValid_RejectsNullConfig(t *testing.T) {
	t.Parallel()

	req := dtos.GameSettingsRequest{
		GameType: "scale",
		Config:   json.RawMessage("null"),
	}

	problems := req.Valid(context.Background())

	assert.NotEmpty(t, problems["config"], "game settings with a null config must fail validation")
}
