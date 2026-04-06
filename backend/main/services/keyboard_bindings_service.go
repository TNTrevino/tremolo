package services

import (
	"context"
	"database/sql"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

// DEFAULT_KEYBOARD_BINDINGS defines the standard QWERTY layout for the note game.
// Naturals (home row): a,s,d,f,g,h,j  Sharps (top row): q,w,e,r,t,y,u  Flats (bottom row): z,x,c,v,b,n,m
var DEFAULT_KEYBOARD_BINDINGS = dtos.KeyBindings{
	KeyC: "a", KeyD: "s", KeyE: "d", KeyF: "f", KeyG: "g", KeyA: "h", KeyB: "j",
	KeyCSharp: "q", KeyDSharp: "w", KeyESharp: "e", KeyFSharp: "r", KeyGSharp: "t", KeyASharp: "y", KeyBSharp: "u",
	KeyCFlat: "z", KeyDFlat: "x", KeyEFlat: "c", KeyFFlat: "v", KeyGFlat: "b", KeyAFlat: "n", KeyBFlat: "m",
}

// CreateDefaultKeyboardBindings seeds a new user with the standard QWERTY key layout.
func CreateDefaultKeyboardBindings(ctx context.Context, q generated.Querier, userID int) error {
	req := &dtos.KeyboardBindingsRequest{KeyBindings: DEFAULT_KEYBOARD_BINDINGS}
	_, err := UpsertKeyboardBindings(ctx, q, userID, req)
	return err
}

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

	kb := req.KeyBindings
	params := generated.UpsertKeyboardBindingsParams{
		UserID:    int32(userID),
		KeyC:      kb.KeyC,
		KeyD:      kb.KeyD,
		KeyE:      kb.KeyE,
		KeyF:      kb.KeyF,
		KeyG:      kb.KeyG,
		KeyA:      kb.KeyA,
		KeyB:      kb.KeyB,
		KeyCSharp: kb.KeyCSharp,
		KeyDSharp: kb.KeyDSharp,
		KeyESharp: kb.KeyESharp,
		KeyFSharp: kb.KeyFSharp,
		KeyGSharp: kb.KeyGSharp,
		KeyASharp: kb.KeyASharp,
		KeyBSharp: kb.KeyBSharp,
		KeyCFlat:  kb.KeyCFlat,
		KeyDFlat:  kb.KeyDFlat,
		KeyEFlat:  kb.KeyEFlat,
		KeyFFlat:  kb.KeyFFlat,
		KeyGFlat:  kb.KeyGFlat,
		KeyAFlat:  kb.KeyAFlat,
		KeyBFlat:  kb.KeyBFlat,
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
		ID:     int(row.ID),
		UserID: int(row.UserID),
		KeyBindings: dtos.KeyBindings{
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
		},
	}
}
