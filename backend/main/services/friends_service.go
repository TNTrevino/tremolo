package services

import (
	"context"
	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

func GetFriends(ctx context.Context, q generated.Querier, userID int) ([]dtos.FriendDTO, error) {
	rows, err := q.GetFriendsByUserID(ctx, int32(userID))
	if err != nil {
		logger.Error("Failed to fetch friends",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	friends := make([]dtos.FriendDTO, 0, len(rows))
	for _, row := range rows {
		friends = append(friends, convertFriendRowToDTO(row))
	}

	return friends, nil
}

func convertFriendRowToDTO(row generated.GetFriendsByUserIDRow) dtos.FriendDTO {
	role := ""
	if row.Role.Valid {
		role = row.Role.String
	}

	instrument := ""
	if row.Instrument.Valid {
		instrument = row.Instrument.String
	}

	return dtos.FriendDTO{
		ID:         row.ID,
		FirstName:  row.FirstName,
		LastName:   row.LastName,
		Role:       role,
		Instrument: instrument,
		AvatarUrl:  dtos.GenerateAvatarURL(row.ID),
		School:     row.School,
	}
}
