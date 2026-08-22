package services

import (
	"context"
	"database/sql"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

// GetGameSettings fetches the saved settings for one game type.
// Returns (nil, nil) when the user has no saved settings for it.
func GetGameSettings(ctx context.Context, q generated.Querier, userID int, gameType string) (*dtos.GameSettingsResponse, error) {
	if !dtos.ValidSettingsGameTypes[gameType] {
		return nil, ErrValidation
	}

	row, err := q.GetGameSettings(ctx, generated.GetGameSettingsParams{
		UserID:   int32(userID),
		GameType: gameType,
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		logger.Error("Failed to fetch game settings",
			"error", err.Error(),
			"user_id", userID,
			"game_type", gameType)
		return nil, err
	}

	resp := convertGameSettingsRowToDTO(row)
	return &resp, nil
}

// UpsertGameSettings saves (or replaces) the settings for one game type.
func UpsertGameSettings(ctx context.Context, q generated.Querier, userID int, req *dtos.GameSettingsRequest) (*dtos.GameSettingsResponse, error) {
	row, err := q.UpsertGameSettings(ctx, generated.UpsertGameSettingsParams{
		UserID:   int32(userID),
		GameType: req.GameType,
		Config:   req.Config,
	})
	if err != nil {
		logger.Error("Failed to upsert game settings",
			"error", err.Error(),
			"user_id", userID,
			"game_type", req.GameType)
		return nil, err
	}

	logger.Info("Game settings upserted successfully",
		"user_id", userID,
		"game_type", req.GameType)

	resp := convertGameSettingsRowToDTO(row)
	return &resp, nil
}

func convertGameSettingsRowToDTO(row generated.TremoloGameSetting) dtos.GameSettingsResponse {
	return dtos.GameSettingsResponse{
		ID:       int(row.ID),
		UserID:   int(row.UserID),
		GameType: row.GameType,
		Config:   row.Config,
	}
}
