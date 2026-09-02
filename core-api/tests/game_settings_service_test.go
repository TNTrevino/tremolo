package tests

import (
	"context"
	"encoding/json"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestUpsertGameSettings_CreateAndUpdate(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "game_settings_upsert")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	req := &dtos.GameSettingsRequest{
		GameType: "key_signature",
		Config:   json.RawMessage(`{"maxAccidentals": 4, "keyTypes": ["sharps"]}`),
	}

	created, err := services.UpsertGameSettings(context.Background(), database.Queries, userID, req)
	require.NoError(t, err)
	require.NotNil(t, created)
	assert.Equal(t, userID, created.UserID)
	assert.Equal(t, "key_signature", created.GameType)

	// Update the same (user, game_type) row
	req.Config = json.RawMessage(`{"maxAccidentals": 7, "keyTypes": ["sharps", "flats"]}`)
	updated, err := services.UpsertGameSettings(context.Background(), database.Queries, userID, req)
	require.NoError(t, err)
	assert.Equal(t, created.ID, updated.ID, "upsert should update the existing row")

	var config map[string]any
	require.NoError(t, json.Unmarshal(updated.Config, &config))
	assert.Equal(t, float64(7), config["maxAccidentals"])
}

func TestUpsertGameSettings_SeparateRowsPerGameType(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "game_settings_types")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	scaleReq := &dtos.GameSettingsRequest{
		GameType: "scale",
		Config:   json.RawMessage(`{"scaleTypes": ["major"]}`),
	}
	chordReq := &dtos.GameSettingsRequest{
		GameType: "chord",
		Config:   json.RawMessage(`{"qualities": ["major", "minor"]}`),
	}

	scaleRes, err := services.UpsertGameSettings(context.Background(), database.Queries, userID, scaleReq)
	require.NoError(t, err)
	chordRes, err := services.UpsertGameSettings(context.Background(), database.Queries, userID, chordReq)
	require.NoError(t, err)

	assert.NotEqual(t, scaleRes.ID, chordRes.ID, "each game type should have its own row")

	fetched, err := services.GetGameSettings(context.Background(), database.Queries, userID, "scale")
	require.NoError(t, err)
	require.NotNil(t, fetched)
	assert.Equal(t, scaleRes.ID, fetched.ID)
}

func TestGetGameSettings_NoRowReturnsNil(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "game_settings_empty")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	result, err := services.GetGameSettings(context.Background(), database.Queries, userID, "chord")
	require.NoError(t, err)
	assert.Nil(t, result)
}

func TestGetGameSettings_InvalidGameType(t *testing.T) {
	testutil.SetupTestDB(t)
	t.Parallel()

	email := testutil.UniqueEmail(t, "game_settings_bad_type")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	_, err := services.GetGameSettings(context.Background(), database.Queries, userID, "poker")
	assert.ErrorIs(t, err, services.ErrValidation)
}

func TestGameSettingsRequest_Validate(t *testing.T) {
	t.Parallel()

	cases := []struct {
		name    string
		req     dtos.GameSettingsRequest
		wantErr bool
	}{
		{
			name: "valid",
			req: dtos.GameSettingsRequest{
				GameType: "scale",
				Config:   json.RawMessage(`{"a": 1}`),
			},
		},
		{
			name: "note game uses its own table",
			req: dtos.GameSettingsRequest{
				GameType: "note",
				Config:   json.RawMessage(`{}`),
			},
			wantErr: true,
		},
		{
			name: "invalid json",
			req: dtos.GameSettingsRequest{
				GameType: "chord",
				Config:   json.RawMessage(`{not json`),
			},
			wantErr: true,
		},
		{
			name: "non-object json",
			req: dtos.GameSettingsRequest{
				GameType: "chord",
				Config:   json.RawMessage(`[1, 2]`),
			},
			wantErr: true,
		},
		{
			name: "missing config",
			req: dtos.GameSettingsRequest{
				GameType: "chord",
			},
			wantErr: true,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			problems := tc.req.Valid(context.Background())
			if tc.wantErr {
				assert.NotEmpty(t, problems)
			} else {
				assert.Empty(t, problems)
			}
		})
	}
}
