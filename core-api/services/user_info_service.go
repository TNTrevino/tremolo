// Package services provides user information retrieval for profile displays
package services

import (
	"context"
	"database/sql"
	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

// GetGeneralUserInfo fetches basic user information and aggregate statistics
// Returns user name, join date, total entries, and total practice time
func GetGeneralUserInfo(ctx context.Context, q generated.Querier, userID int) (*dtos.GeneralUserInfoDTO, error) {
	userInfo, err := q.GetUserGeneralInfo(ctx, int32(userID))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		logger.Error("Failed to fetch general user info",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	result := convertGetUserGeneralInfoRowToDTO(userInfo)
	return &result, nil
}
