package services

import (
	"context"
	"database/sql"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

func GetKeyboardBindings(ctx context.Context, q generated.Querier, userID int) (*dtos.KeyboardBindingsResponse, error) {
	row, err := q.GetKeyboardBindings(ctx, int32(userID))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		logger.Error("Failed to fetch keyboard bindings",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	resp := convertKeyboardBindingsRowToDTO(row)
	return &resp, nil
}

func UpsertKeyboardBindings(ctx context.Context, q generated.Querier, userID int, req *dtos.KeyboardBindingsRequest) (*dtos.KeyboardBindingsResponse, error) {
	if err := req.Validate(); err != nil {
		logger.Error("Keyboard bindings validation failed",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	params := generated.UpsertKeyboardBindingsParams{
		UserID:    int32(userID),
		KeyC:      req.KeyC,
		KeyD:      req.KeyD,
		KeyE:      req.KeyE,
		KeyF:      req.KeyF,
		KeyG:      req.KeyG,
		KeyA:      req.KeyA,
		KeyB:      req.KeyB,
		KeyCSharp: req.KeyCSharp,
		KeyDSharp: req.KeyDSharp,
		KeyESharp: req.KeyESharp,
		KeyFSharp: req.KeyFSharp,
		KeyGSharp: req.KeyGSharp,
		KeyASharp: req.KeyASharp,
		KeyBSharp: req.KeyBSharp,
		KeyCFlat:  req.KeyCFlat,
		KeyDFlat:  req.KeyDFlat,
		KeyEFlat:  req.KeyEFlat,
		KeyFFlat:  req.KeyFFlat,
		KeyGFlat:  req.KeyGFlat,
		KeyAFlat:  req.KeyAFlat,
		KeyBFlat:  req.KeyBFlat,
	}

	row, err := q.UpsertKeyboardBindings(ctx, params)
	if err != nil {
		logger.Error("Failed to upsert keyboard bindings",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	logger.Info("Keyboard bindings upserted successfully",
		"user_id", userID)

	resp := convertKeyboardBindingsRowToDTO(row)
	return &resp, nil
}

func convertKeyboardBindingsRowToDTO(row generated.TremoloKeyboardBinding) dtos.KeyboardBindingsResponse {
	return dtos.KeyboardBindingsResponse{
		ID:        int(row.ID),
		UserID:    int(row.UserID),
		KeyC:      row.KeyC,
		KeyD:      row.KeyD,
		KeyE:      row.KeyE,
		KeyF:      row.KeyF,
		KeyG:      row.KeyG,
		KeyA:      row.KeyA,
		KeyB:      row.KeyB,
		KeyCSharp: row.KeyCSharp,
		KeyDSharp: row.KeyDSharp,
		KeyESharp: row.KeyESharp,
		KeyFSharp: row.KeyFSharp,
		KeyGSharp: row.KeyGSharp,
		KeyASharp: row.KeyASharp,
		KeyBSharp: row.KeyBSharp,
		KeyCFlat:  row.KeyCFlat,
		KeyDFlat:  row.KeyDFlat,
		KeyEFlat:  row.KeyEFlat,
		KeyFFlat:  row.KeyFFlat,
		KeyGFlat:  row.KeyGFlat,
		KeyAFlat:  row.KeyAFlat,
		KeyBFlat:  row.KeyBFlat,
	}
}
