package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
)

// ExportUserData assembles everything this service holds about one user
// into the payload for GET /api/users/{userId}/export (#243) -- the
// data-portability response the account page downloads as a JSON file.
// Access control (self-only) is the controller's job, via requireSelf;
// this function trusts userID and fetches unconditionally.
//
// Past the initial profile lookup, every other failure aborts the whole
// export, wrapped for context, rather than omitting the section that
// failed: a partial export that still returns 200 with a JSON file the
// account owner assumes is everything would be worse than an outright
// 500, because nothing in the response says a section is missing. The
// one deliberate exception is the two optional single-row settings
// fetches (note-game settings, keyboard bindings): GetNoteGameSettings
// and GetKeyboardBindings already turn sql.ErrNoRows into (nil, nil),
// because there absence means "never saved this", not failure.
func ExportUserData(ctx context.Context, q generated.Querier, userID int) (*dtos.UserExport, error) {
	profileRow, err := q.GetUserForExport(ctx, int32(userID))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("look up user for export: %w", err)
	}

	noteGameSettings, err := GetNoteGameSettings(ctx, q, userID)
	if err != nil {
		return nil, fmt.Errorf("fetch note game settings for export: %w", err)
	}

	keyboardBindings, err := GetKeyboardBindings(ctx, q, userID)
	if err != nil {
		return nil, fmt.Errorf("fetch keyboard bindings for export: %w", err)
	}

	gameSettingsRows, err := q.ListGameSettingsByUser(ctx, int32(userID))
	if err != nil {
		return nil, fmt.Errorf("list game settings for export: %w", err)
	}

	entryRows, err := q.GetEntriesByUserID(ctx, int32(userID))
	if err != nil {
		return nil, fmt.Errorf("list score entries for export: %w", err)
	}

	joinedRows, err := q.ListClassesByStudent(ctx, int32(userID))
	if err != nil {
		return nil, fmt.Errorf("list joined classes for export: %w", err)
	}

	ownedRows, err := q.ListClassesByTeacher(ctx, int32(userID))
	if err != nil {
		return nil, fmt.Errorf("list owned classes for export: %w", err)
	}

	attemptRows, err := q.ListAssignmentAttemptsByUser(ctx, int32(userID))
	if err != nil {
		return nil, fmt.Errorf("list assignment attempts for export: %w", err)
	}

	friendRows, err := q.GetFriendsByUserID(ctx, int32(userID))
	if err != nil {
		return nil, fmt.Errorf("list friends for export: %w", err)
	}

	return &dtos.UserExport{
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Profile:    convertUserForExportRowToDTO(profileRow),
		Settings: dtos.ExportSettings{
			NoteGame: noteGameSettings,
			Games:    convertGameSettingsRowsToExportDTO(gameSettingsRows),
		},
		KeyboardBindings: keyboardBindings,
		ScoreEntries:     convertScoreEntryRowsToExportDTO(entryRows),
		Classes: dtos.ExportClasses{
			Joined: convertJoinedClassRowsToExportDTO(joinedRows),
			Owned:  convertOwnedClassRowsToExportDTO(ownedRows),
		},
		AssignmentAttempts: convertAssignmentAttemptRowsToExportDTO(attemptRows),
		Friends:            convertFriendRowsToExportDTO(friendRows),
	}, nil
}

// exportDateString formats a nullable DATE column the way the rest of
// the API does (note_game_helpers.go's convertNoteGameEntryRowToDTO):
// "2006-01-02", or "" when the column is null.
func exportDateString(t sql.NullTime) string {
	if !t.Valid {
		return ""
	}
	return t.Time.Format("2006-01-02")
}

// exportTimeString formats a nullable TIME-of-day column. Same format
// CreateNoteGameEntry parses TimeLength with ("15:04:05"), just applied
// to a nullable column instead of a not-null one.
func exportTimeString(t sql.NullTime) string {
	if !t.Valid {
		return ""
	}
	return t.Time.Format("15:04:05")
}

func convertUserForExportRowToDTO(row generated.GetUserForExportRow) dtos.ExportProfile {
	// sqlc cannot infer a bool type for the computed `is not null`
	// expression, so HasGoogle comes back as interface{} -- the same
	// fallback convertGetUserGeneralInfoRowToDTO already works around
	// for TotalDuration.
	hasGoogle, _ := row.HasGoogle.(bool)

	return dtos.ExportProfile{
		ID:          int(row.ID),
		FirstName:   row.FirstName,
		LastName:    row.LastName,
		Email:       row.Email,
		Role:        row.Role,
		Instrument:  row.Instrument,
		School:      row.School,
		HasGoogle:   hasGoogle,
		CreatedDate: exportDateString(row.CreatedDate),
		CreatedTime: exportTimeString(row.CreatedTime),
	}
}

func convertGameSettingsRowsToExportDTO(rows []generated.ListGameSettingsByUserRow) []dtos.ExportGameSettings {
	settings := make([]dtos.ExportGameSettings, 0, len(rows))
	for _, row := range rows {
		settings = append(settings, dtos.ExportGameSettings{
			GameType: row.GameType,
			Config:   row.Config,
		})
	}
	return settings
}

func convertScoreEntryRowsToExportDTO(rows []generated.TremoloNoteGameEntry) []dtos.ExportScoreEntry {
	entries := make([]dtos.ExportScoreEntry, 0, len(rows))
	for _, row := range rows {
		var assignmentID *int
		if row.AssignmentID.Valid {
			id := int(row.AssignmentID.Int32)
			assignmentID = &id
		}

		entries = append(entries, dtos.ExportScoreEntry{
			ID:               int(row.ID),
			GameType:         row.GameType,
			TotalQuestions:   int(row.TotalQuestions),
			CorrectQuestions: int(row.CorrectQuestions),
			NotesPerMinute:   int(row.NotesPerMinute),
			TimeLength:       row.TimeLength.Format("15:04:05"),
			AssignmentID:     assignmentID,
			CreatedDate:      exportDateString(row.CreatedDate),
			CreatedTime:      exportTimeString(row.CreatedTime),
		})
	}
	return entries
}

func convertJoinedClassRowsToExportDTO(rows []generated.ListClassesByStudentRow) []dtos.ExportJoinedClass {
	classes := make([]dtos.ExportJoinedClass, 0, len(rows))
	for _, row := range rows {
		classes = append(classes, dtos.ExportJoinedClass{
			ID:          int(row.ID),
			Name:        row.Name,
			TeacherName: row.TeacherFirstName + " " + row.TeacherLastName,
		})
	}
	return classes
}

func convertOwnedClassRowsToExportDTO(rows []generated.ListClassesByTeacherRow) []dtos.ExportOwnedClass {
	classes := make([]dtos.ExportOwnedClass, 0, len(rows))
	for _, row := range rows {
		classes = append(classes, dtos.ExportOwnedClass{
			ID:           int(row.ID),
			Name:         row.Name,
			JoinCode:     row.JoinCode,
			StudentCount: int(row.StudentCount),
			CreatedAt:    row.CreatedAt,
		})
	}
	return classes
}

func convertAssignmentAttemptRowsToExportDTO(rows []generated.ListAssignmentAttemptsByUserRow) []dtos.ExportAttempt {
	attempts := make([]dtos.ExportAttempt, 0, len(rows))
	for _, row := range rows {
		attempts = append(attempts, dtos.ExportAttempt{
			EntryID:          int(row.EntryID),
			AssignmentID:     int(row.AssignmentID),
			AssignmentTitle:  row.AssignmentTitle,
			GameType:         row.GameType,
			ClassName:        row.ClassName,
			CorrectQuestions: int(row.CorrectQuestions),
			TotalQuestions:   int(row.TotalQuestions),
			NotesPerMinute:   int(row.NotesPerMinute),
			TimeLength:       row.TimeLength.Format("15:04:05"),
			CreatedDate:      exportDateString(row.CreatedDate),
			CreatedTime:      exportTimeString(row.CreatedTime),
		})
	}
	return attempts
}

func convertFriendRowsToExportDTO(rows []generated.GetFriendsByUserIDRow) []dtos.ExportFriend {
	friends := make([]dtos.ExportFriend, 0, len(rows))
	for _, row := range rows {
		instrument := ""
		if row.Instrument.Valid {
			instrument = row.Instrument.String
		}

		friends = append(friends, dtos.ExportFriend{
			ID:         int(row.ID),
			FirstName:  row.FirstName,
			LastName:   row.LastName,
			Role:       row.Role,
			Instrument: instrument,
			School:     row.School,
		})
	}
	return friends
}
