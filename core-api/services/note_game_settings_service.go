package services

import (
	"context"
	"database/sql"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

func GetNoteGameSettings(ctx context.Context, q generated.Querier, userID int) (*dtos.NoteGameSettingsResponse, error) {
	row, err := q.GetNoteGameSettings(ctx, int32(userID))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		logger.Error("Failed to fetch note game settings",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	resp := convertSettingsRowToDTO(row)
	return &resp, nil
}

func UpsertNoteGameSettings(ctx context.Context, q generated.Querier, userID int, req *dtos.NoteGameSettingsRequest) (*dtos.NoteGameSettingsResponse, error) {
	params := generated.UpsertNoteGameSettingsParams{
		UserID:    int32(userID),
		GameMode:  req.GameMode,
		TimeLimit: int32(req.TimeLimit),
		NoteLimit: int32(req.NoteLimit),
		Scale:     req.Scale,
		Octave:    int32(req.Octave),
		LowNote:   req.LowNote,
		HighNote:  req.HighNote,
		Clef:      req.Clef,
	}

	row, err := q.UpsertNoteGameSettings(ctx, params)
	if err != nil {
		logger.Error("Failed to upsert note game settings",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	logger.Info("Note game settings upserted successfully",
		"user_id", userID)

	resp := convertSettingsRowToDTO(row)
	return &resp, nil
}

func convertSettingsRowToDTO(row generated.TremoloNoteGameSetting) dtos.NoteGameSettingsResponse {
	return dtos.NoteGameSettingsResponse{
		ID:        int(row.ID),
		UserID:    int(row.UserID),
		GameMode:  row.GameMode,
		TimeLimit: int(row.TimeLimit),
		NoteLimit: int(row.NoteLimit),
		Scale:     row.Scale,
		Octave:    int(row.Octave),
		LowNote:   row.LowNote,
		HighNote:  row.HighNote,
		Clef:      row.Clef,
	}
}
