package services

import (
	"context"
	"errors"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

var (
	ErrUnauthorized = errors.New("access denied: user cannot create entry for another user")
	ErrValidation   = errors.New("validation failed")
)

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

	params := generated.CreateNoteGameEntryParams{
		UserID:           int32(entry.UserID),
		TimeLength:       timeLength,
		TotalQuestions:   int32(entry.TotalQuestions),
		CorrectQuestions: int32(entry.CorrectQuestions),
		NotesPerMinute:   int32(entry.NPM),
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

// GetRecentNoteGameEntries retrieves the last 30 note game entries for a user
func GetRecentNoteGameEntries(ctx context.Context, q generated.Querier, authenticatedUserID int) ([]dtos.NoteGameEntryResponse, error) {
	rows, err := q.GetRecentEntriesByUserID(ctx, int32(authenticatedUserID))
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
