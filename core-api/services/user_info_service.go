// Package services provides user information retrieval for profile displays
package services

import (
	"context"
	"database/sql"
	"errors"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

// GetGeneralUserInfo fetches basic user information and aggregate statistics
// for requestedUserID, on behalf of callerID. Returns user name, join date,
// total entries, and total practice time. callerID may read requestedUserID's
// data when they are the same user, or when callerID owns an active class
// requestedUserID is enrolled in -- see RequireUserStatsAccess.
func GetGeneralUserInfo(ctx context.Context, q generated.Querier, callerID, requestedUserID int) (*dtos.GeneralUserInfoDTO, error) {
	if err := RequireUserStatsAccess(ctx, q, callerID, requestedUserID); err != nil {
		return nil, err
	}

	userInfo, err := q.GetUserGeneralInfo(ctx, int32(requestedUserID))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		logger.Error("Failed to fetch general user info",
			"error", err.Error(),
			"user_id", requestedUserID)
		return nil, err
	}

	result := convertGetUserGeneralInfoRowToDTO(userInfo)
	return &result, nil
}
