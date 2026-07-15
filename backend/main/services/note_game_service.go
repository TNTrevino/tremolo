package services

import (
	"context"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

// normalizeGameType defaults an empty game type to "note" (legacy
// clients) and rejects unknown values (per dtos.ValidGameTypes).
func normalizeGameType(gameType string) (string, error) {
	if gameType == "" {
		return "note", nil
	}
	if !dtos.ValidGameTypes[gameType] {
		return "", ErrValidation
	}
	return gameType, nil
}

const (
	// RecentEntriesLimit is the maximum number of recent entries returned by GetRecentEntriesByUserID
	// This should match the LIMIT clause in the SQL query
	RecentEntriesLimit = 30
)

// CreateNoteGameEntry handles business logic for saving a note game entry
// Validates entry data and authorization before saving
func CreateNoteGameEntry(ctx context.Context, q generated.Querier, authenticatedUserID int, entry *dtos.Entry) (int64, error) {
	// Validate entry data
	if err := entry.ValidateEntry(); err != nil {
		logger.Error("Entry validation failed",
			"error", err.Error(),
			"user_id", entry.UserID)
		return 0, err
	}

	// Authorization: Verify the user_id in the request matches authenticated user
	if int(entry.UserID) != authenticatedUserID {
		logger.Warn("Authorization failed: user ID mismatch",
			"authenticated_user_id", authenticatedUserID,
			"requested_user_id", entry.UserID)
		return 0, ErrUnauthorized
	}

	// Parse time_length string (format "HH:MM:SS") to time.Time
	timeLength, err := time.Parse("15:04:05", entry.TimeLength)
	if err != nil {
		logger.Error("Failed to parse time_length",
			"error", err.Error(),
			"time_length", entry.TimeLength)
		return 0, err
	}

	gameType, err := normalizeGameType(entry.GameType)
	if err != nil {
		logger.Error("Invalid game type",
			"game_type", entry.GameType,
			"user_id", entry.UserID)
		return 0, err
	}

	if entry.AssignmentID != nil {
		if err := ValidateEntryAssignment(ctx, q, authenticatedUserID, *entry.AssignmentID, gameType); err != nil {
			logger.Warn("Rejected assignment tag on entry",
				"error", err.Error(),
				"assignment_id", *entry.AssignmentID,
				"user_id", entry.UserID)
			return 0, err
		}
	}
	assignmentID := nullInt32FromPtr(entry.AssignmentID)

	params := generated.CreateNoteGameEntryParams{
		UserID:           int32(entry.UserID),
		TimeLength:       timeLength,
		TotalQuestions:   int32(entry.TotalQuestions),
		CorrectQuestions: int32(entry.CorrectQuestions),
		NotesPerMinute:   int32(entry.NPM),
		GameType:         gameType,
		AssignmentID:     assignmentID,
	}

	entryID, err := q.CreateNoteGameEntry(ctx, params)
	if err != nil {
		logger.Error("Failed to create note game entry",
			"error", err.Error(),
			"user_id", entry.UserID)
		return 0, err
	}

	logger.Info("Note game entry created successfully",
		"entry_id", entryID,
		"user_id", entry.UserID)

	return int64(entryID), nil
}

// ActivityHeatmapDays is the number of days of activity data to return (≈1 year).
const ActivityHeatmapDays = 365

// GetDailyActivityCounts returns per-day game counts for the activity heatmap.
func GetDailyActivityCounts(ctx context.Context, q generated.Querier, authenticatedUserID int) ([]dtos.DailyActivityCount, error) {
	rows, err := q.GetDailyActivityCounts(ctx, generated.GetDailyActivityCountsParams{
		UserID:   int32(authenticatedUserID),
		DaysBack: ActivityHeatmapDays,
	})
	if err != nil {
		logger.Error("Failed to fetch daily activity counts",
			"error", err.Error(),
			"user_id", authenticatedUserID)
		return nil, err
	}

	counts := make([]dtos.DailyActivityCount, 0, len(rows))
	for _, row := range rows {
		if !row.CreatedDate.Valid {
			continue
		}
		counts = append(counts, dtos.DailyActivityCount{
			Date:      row.CreatedDate.Time.Format("2006-01-02"),
			GameCount: int(row.GameCount),
		})
	}

	logger.Debug("Daily activity counts fetched successfully",
		"user_id", authenticatedUserID,
		"days_with_activity", len(counts))

	return counts, nil
}

// GetRecentNoteGameEntries retrieves the last 30 game entries for a user
// for the given game type ("note", "key_signature", "scale", "chord").
func GetRecentNoteGameEntries(ctx context.Context, q generated.Querier, authenticatedUserID int, gameType string) ([]dtos.NoteGameEntryResponse, error) {
	normalizedType, err := normalizeGameType(gameType)
	if err != nil {
		return nil, err
	}

	rows, err := q.GetRecentEntriesByUserID(ctx, generated.GetRecentEntriesByUserIDParams{
		UserID:   int32(authenticatedUserID),
		GameType: normalizedType,
	})
	if err != nil {
		logger.Error("Failed to fetch recent note game entries",
			"error", err.Error(),
			"user_id", authenticatedUserID)
		return nil, err
	}

	entries := convertNoteGameEntryRowsToDTO(rows)

	logger.Info("Recent note game entries fetched successfully",
		"user_id", authenticatedUserID,
		"count", len(entries))

	return entries, nil
}
