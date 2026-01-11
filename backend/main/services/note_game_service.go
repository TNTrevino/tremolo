package services

import (
	"errors"
	dtos "sight-reading/DTOs"
	"sight-reading/logger"
	"sight-reading/repositories"
)

var (
	ErrUnauthorized = errors.New("access denied: user cannot create entry for another user")
	ErrValidation   = errors.New("validation failed")
)

// CreateNoteGameEntry handles business logic for saving a note game entry
// Validates entry data and authorization before saving
func CreateNoteGameEntry(authenticatedUserID int, entry *dtos.Entry) (int64, error) {
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

	noteGameRepo := repositories.NewNoteGameRepository()

	repoEntry := repositories.NoteGameEntry{
		UserID:           int(entry.UserID),
		TimeLength:       entry.TimeLength,
		TotalQuestions:   int(entry.TotalQuestions),
		CorrectQuestions: int(entry.CorrectQuestions),
		NotesPerMinute:   float64(entry.NPM),
	}

	entryID, err := noteGameRepo.CreateNoteGameEntry(repoEntry)
	if err != nil {
		logger.Error("Failed to create note game entry",
			"error", err.Error(),
			"user_id", entry.UserID)
		return 0, err
	}

	logger.Info("Note game entry created successfully",
		"entry_id", entryID,
		"user_id", entry.UserID)

	return entryID, nil
}

// GetRecentNoteGameEntries retrieves the last 30 note game entries for a user
func GetRecentNoteGameEntries(authenticatedUserID int) ([]repositories.NoteGameEntry, error) {
	noteGameRepo := repositories.NewNoteGameRepository()

	entries, err := noteGameRepo.GetRecentEntriesByUserID(authenticatedUserID)
	if err != nil {
		logger.Error("Failed to fetch recent note game entries",
			"error", err.Error(),
			"user_id", authenticatedUserID)
		return nil, err
	}

	logger.Info("Recent note game entries fetched successfully",
		"user_id", authenticatedUserID,
		"count", len(entries))

	return entries, nil
}
