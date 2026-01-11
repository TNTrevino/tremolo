// Package services provides user information retrieval for profile displays
package services

import (
	"context"
	"database/sql"
	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/logger"
)

// GetGeneralUserInfo fetches basic user information and aggregate statistics
// Returns user name, join date, total entries, and total practice time
func GetGeneralUserInfo(userID int) (*dtos.GeneralUserInfoDTO, error) {
	ctx := context.Background()

	userInfo, err := database.Queries.GetUserGeneralInfo(ctx, int32(userID))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		logger.Error("Failed to fetch general user info",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	// Convert TotalDuration from interface{} to string
	totalDuration := "00:00:00"
	if userInfo.TotalDuration != nil {
		if durStr, ok := userInfo.TotalDuration.(string); ok {
			totalDuration = durStr
		}
	}

	dto := dtos.GeneralUserInfo{
		FirstName:    userInfo.FirstName,
		LastName:     userInfo.LastName,
		TotalEntries: int(userInfo.TotalEntries),
	}
	dto.CreatedDate.String = userInfo.CreatedDate
	dto.CreatedDate.Valid = true
	dto.TotalDuration.String = totalDuration
	dto.TotalDuration.Valid = true

	result := dto.ToDTO()
	return &result, nil
}
