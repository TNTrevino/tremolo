package tests

import (
	"encoding/json"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The JSON literal `null` unmarshals into a map target without error, so
// it slipped past the "must be a JSON object" probe. A null config is
// neither an object nor handled downstream as one, and it would get
// persisted as a game-settings row or a frozen assignment snapshot.

func TestConfigBlobErrors_RejectsNull(t *testing.T) {
	t.Parallel()

	errs := dtos.ConfigBlobErrors(json.RawMessage("null"))
	assert.NotEmpty(t, errs, "a literal null config must be rejected")
}

func TestConfigBlobErrors_RejectsBareArrayAndScalar(t *testing.T) {
	t.Parallel()

	assert.NotEmpty(t, dtos.ConfigBlobErrors(json.RawMessage("[]")), "bare array rejected")
	assert.NotEmpty(t, dtos.ConfigBlobErrors(json.RawMessage("5")), "bare scalar rejected")
}

func TestConfigBlobErrors_AcceptsObject(t *testing.T) {
	t.Parallel()

	assert.Empty(t, dtos.ConfigBlobErrors(json.RawMessage(`{"scale":"C"}`)), "a JSON object is valid")
}

func TestCreateAssignmentValidation_RejectsNullConfig(t *testing.T) {
	t.Parallel()

	req := &dtos.CreateAssignmentRequest{
		Title:    "Week 1",
		GameType: "note",
		Config:   json.RawMessage("null"),
	}
	err := req.Validate()
	require.Error(t, err, "assignment with a null config must fail validation")
	assert.Contains(t, err.Error(), "Config")
}

func TestGameSettingsValidation_RejectsNullConfig(t *testing.T) {
	t.Parallel()

	req := &dtos.GameSettingsRequest{
		GameType: "scale",
		Config:   json.RawMessage("null"),
	}
	err := req.Validate()
	require.Error(t, err, "game settings with a null config must fail validation")
}
