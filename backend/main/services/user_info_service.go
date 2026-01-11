// Package services provides user information retrieval for profile displays
package services

import (
	"database/sql"
	dtos "sight-reading/DTOs"
	"sight-reading/logger"
	"sight-reading/repositories"
)

// GetGeneralUserInfo fetches basic user information and aggregate statistics
// Returns user name, join date, total entries, and total practice time
func GetGeneralUserInfo(userID int) (*dtos.GeneralUserInfoDTO, error) {
	userRepo := repositories.NewUserRepository()

	userInfo, err := userRepo.GetUserGeneralInfo(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, err
		}
		logger.Error("Failed to fetch general user info",
			"error", err.Error(),
			"user_id", userID)
		return nil, err
	}

	dto := dtos.GeneralUserInfo{
		FirstName:    userInfo.FirstName,
		LastName:     userInfo.LastName,
		TotalEntries: userInfo.TotalEntries,
	}
	dto.CreatedDate.String = userInfo.CreatedDate
	dto.CreatedDate.Valid = true
	dto.TotalDuration.String = userInfo.TotalDuration
	dto.TotalDuration.Valid = true

	result := dto.ToDTO()
	return &result, nil
}
