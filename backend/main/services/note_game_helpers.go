package services

import (
	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
)

// convertNoteGameEntryRowToDTO converts a single GetRecentEntriesByUserIDRow to a NoteGameEntryResponse DTO
// Handles date formatting and type conversions for API responses
func convertNoteGameEntryRowToDTO(row generated.GetRecentEntriesByUserIDRow) dtos.NoteGameEntryResponse {
	createdDate := ""
	if row.CreatedDate.Valid {
		createdDate = row.CreatedDate.Time.Format("2006-01-02")
	}

	return dtos.NoteGameEntryResponse{
		ID:               int(row.ID),
		UserID:           int(row.UserID),
		TimeLength:       row.TimeLength.Format("15:04:05"),
		TotalQuestions:   int(row.TotalQuestions),
		CorrectQuestions: int(row.CorrectQuestions),
		NotesPerMinute:   float64(row.NotesPerMinute),
		CreatedDate:      createdDate,
	}
}

// convertNoteGameEntryRowsToDTO converts a slice of GetRecentEntriesByUserIDRow to NoteGameEntryResponse DTOs
// Used when returning multiple note game entries from API endpoints
func convertNoteGameEntryRowsToDTO(rows []generated.GetRecentEntriesByUserIDRow) []dtos.NoteGameEntryResponse {
	entries := make([]dtos.NoteGameEntryResponse, len(rows))
	for i, row := range rows {
		entries[i] = convertNoteGameEntryRowToDTO(row)
	}
	return entries
}
