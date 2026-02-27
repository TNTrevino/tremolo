package services

import (
	"context"
	"database/sql"
	"errors"
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

func SearchUsers(ctx context.Context, q generated.Querier, userID int, query string) ([]dtos.FriendDTO, error) {
	rows, err := q.SearchUsersByName(ctx, generated.SearchUsersByNameParams{
		UserID: int32(userID),
		Query:  sql.NullString{String: query, Valid: true},
	})
	if err != nil {
		logger.Error("Failed to search users",
			"error", err.Error(),
			"user_id", userID,
			"query", query)
		return nil, err
	}

	results := make([]dtos.FriendDTO, 0, len(rows))
	for _, row := range rows {
		results = append(results, convertSearchRowToDTO(row))
	}

	return results, nil
}

func AddFriend(ctx context.Context, q generated.Querier, userID int, friendID int) error {
	if userID == friendID {
		return errors.New("cannot add yourself as a friend")
	}

	err := q.CreateMutualFriendship(ctx, generated.CreateMutualFriendshipParams{
		UserID:   int32(userID),
		FriendID: int32(friendID),
	})
	if err != nil {
		logger.Error("Failed to create friendship",
			"error", err.Error(),
			"user_id", userID,
			"friend_id", friendID)
		return err
	}

	return nil
}

func convertFriendRowToDTO(row generated.GetFriendsByUserIDRow) dtos.FriendDTO {
	instrument := ""
	if row.Instrument.Valid {
		instrument = row.Instrument.String
	}

	return dtos.FriendDTO{
		ID:         row.ID,
		FirstName:  row.FirstName,
		LastName:   row.LastName,
		Role:       row.Role,
		Instrument: instrument,
		AvatarUrl:  dtos.GenerateAvatarURL(row.ID),
		School:     row.School,
	}
}

func convertSearchRowToDTO(row generated.SearchUsersByNameRow) dtos.FriendDTO {
	instrument := ""
	if row.Instrument.Valid {
		instrument = row.Instrument.String
	}

	return dtos.FriendDTO{
		ID:         row.ID,
		FirstName:  row.FirstName,
		LastName:   row.LastName,
		Role:       row.Role,
		Instrument: instrument,
		AvatarUrl:  dtos.GenerateAvatarURL(row.ID),
		School:     row.School,
	}
}
