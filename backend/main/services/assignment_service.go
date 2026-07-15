package services

import (
	"context"
	"database/sql"
	"strings"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

func nullInt32FromPtr(v *int) sql.NullInt32 {
	if v == nil {
		return sql.NullInt32{}
	}
	return sql.NullInt32{Int32: int32(*v), Valid: true}
}

func ptrFromNullInt32(v sql.NullInt32) *int {
	if !v.Valid {
		return nil
	}
	i := int(v.Int32)
	return &i
}

func nullTimeFromPtr(v *time.Time) sql.NullTime {
	if v == nil {
		return sql.NullTime{}
	}
	return sql.NullTime{Time: *v, Valid: true}
}

func ptrFromNullTime(v sql.NullTime) *time.Time {
	if !v.Valid {
		return nil
	}
	t := v.Time
	return &t
}

// assignmentToDTO maps an assignment row to its response DTO. Callers
// pass a named struct (not a positional argument list) so a transposed
// pair of same-typed columns is a compile error, not silent bad data.
func assignmentToDTO(a generated.TremoloAssignment) dtos.AssignmentResponse {
	return dtos.AssignmentResponse{
		ID:              int(a.ID),
		ClassID:         int(a.ClassID),
		Title:           a.Title,
		GameType:        a.GameType,
		Config:          a.Config,
		DueAt:           ptrFromNullTime(a.DueAt),
		TargetQuestions: ptrFromNullInt32(a.TargetQuestions),
		TargetAccuracy:  ptrFromNullInt32(a.TargetAccuracy),
		CreatedAt:       a.CreatedAt,
	}
}

// CreateAssignment creates an assignment on a class the caller owns.
// The game config is stored as a frozen snapshot: editing personal
// settings later must not change what was assigned.
func CreateAssignment(ctx context.Context, q generated.Querier, teacherID, classID int, req *dtos.CreateAssignmentRequest) (*dtos.AssignmentResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, validationErr(err)
	}
	if _, err := requireClassOwner(ctx, q, teacherID, classID); err != nil {
		return nil, err
	}

	assignment, err := q.CreateAssignment(ctx, generated.CreateAssignmentParams{
		ClassID:         int32(classID),
		Title:           strings.TrimSpace(req.Title),
		GameType:        req.GameType,
		Config:          req.Config,
		DueAt:           nullTimeFromPtr(req.DueAt),
		TargetQuestions: nullInt32FromPtr(req.TargetQuestions),
		TargetAccuracy:  nullInt32FromPtr(req.TargetAccuracy),
	})
	if err != nil {
		logger.Error("Failed to create assignment",
			"error", err.Error(),
			"class_id", classID,
			"teacher_id", teacherID)
		return nil, err
	}

	logger.Info("Assignment created",
		"assignment_id", assignment.ID,
		"class_id", classID)
	resp := assignmentToDTO(assignment)
	return &resp, nil
}

// ListClassAssignments returns a class's assignments for its owner.
func ListClassAssignments(ctx context.Context, q generated.Querier, teacherID, classID int) ([]dtos.AssignmentResponse, error) {
	if _, err := requireClassOwner(ctx, q, teacherID, classID); err != nil {
		return nil, err
	}

	rows, err := q.ListAssignmentsByClass(ctx, int32(classID))
	if err != nil {
		logger.Error("Failed to list assignments",
			"error", err.Error(),
			"class_id", classID)
		return nil, err
	}

	assignments := make([]dtos.AssignmentResponse, 0, len(rows))
	for _, row := range rows {
		assignments = append(assignments, assignmentToDTO(row))
	}
	return assignments, nil
}

// ListStudentAssignments returns every assignment in the caller's
// classes with their own aggregated progress.
func ListStudentAssignments(ctx context.Context, q generated.Querier, studentID int) ([]dtos.StudentAssignmentResponse, error) {
	rows, err := q.ListAssignmentsForStudent(ctx, int32(studentID))
	if err != nil {
		logger.Error("Failed to list student assignments",
			"error", err.Error(),
			"student_id", studentID)
		return nil, err
	}

	assignments := make([]dtos.StudentAssignmentResponse, 0, len(rows))
	for _, row := range rows {
		// The student-list row carries the same assignment columns as the
		// typed row; map it through the same named-field helper.
		item := dtos.StudentAssignmentResponse{
			AssignmentResponse: assignmentToDTO(generated.TremoloAssignment{
				ID:              row.ID,
				ClassID:         row.ClassID,
				Title:           row.Title,
				GameType:        row.GameType,
				Config:          row.Config,
				DueAt:           row.DueAt,
				TargetQuestions: row.TargetQuestions,
				TargetAccuracy:  row.TargetAccuracy,
				CreatedAt:       row.CreatedAt,
			}),
			ClassName:    row.ClassName,
			AttemptCount: int(row.AttemptCount),
			BestCorrect:  int(row.BestCorrect),
			BestAccuracy: int(row.BestAccuracy),
		}
		assignments = append(assignments, item)
	}
	return assignments, nil
}

// GetAssignmentResults returns the teacher's results grid: one row per
// enrolled student, including students with zero attempts.
func GetAssignmentResults(ctx context.Context, q generated.Querier, teacherID, assignmentID int) ([]dtos.AssignmentResultRow, error) {
	assignment, err := q.GetAssignmentByID(ctx, int32(assignmentID))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if _, err := requireClassOwner(ctx, q, teacherID, int(assignment.ClassID)); err != nil {
		return nil, err
	}

	rows, err := q.GetAssignmentResults(ctx, generated.GetAssignmentResultsParams{
		AssignmentID: sql.NullInt32{Int32: int32(assignmentID), Valid: true},
		ClassID:      assignment.ClassID,
	})
	if err != nil {
		logger.Error("Failed to fetch assignment results",
			"error", err.Error(),
			"assignment_id", assignmentID)
		return nil, err
	}

	results := make([]dtos.AssignmentResultRow, 0, len(rows))
	for _, row := range rows {
		results = append(results, dtos.AssignmentResultRow{
			StudentID:       int(row.StudentID),
			FirstName:       row.FirstName,
			LastName:        row.LastName,
			AttemptCount:    int(row.AttemptCount),
			BestCorrect:     int(row.BestCorrect),
			MostQuestions:   int(row.MostQuestions),
			BestAccuracy:    int(row.BestAccuracy),
			LastAttemptDate: row.LastAttemptDate,
		})
	}
	return results, nil
}

// GetAssignmentAttempts returns one student's attempt history on an
// assignment, oldest to newest -- the drill-down behind the teacher's
// results grid. The caller must either own the assignment's class
// (teacher/admin) or be the student themself; anyone else is forbidden.
func GetAssignmentAttempts(ctx context.Context, q generated.Querier, callerID, assignmentID, studentID int) ([]dtos.AssignmentAttempt, error) {
	assignment, err := q.GetAssignmentByID(ctx, int32(assignmentID))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if callerID != studentID {
		if _, err := requireClassOwner(ctx, q, callerID, int(assignment.ClassID)); err != nil {
			return nil, err
		}
	}

	rows, err := q.GetAssignmentAttempts(ctx, generated.GetAssignmentAttemptsParams{
		AssignmentID: sql.NullInt32{Int32: int32(assignmentID), Valid: true},
		UserID:       int32(studentID),
	})
	if err != nil {
		logger.Error("Failed to fetch assignment attempts",
			"error", err.Error(),
			"assignment_id", assignmentID,
			"student_id", studentID)
		return nil, err
	}

	attempts := make([]dtos.AssignmentAttempt, 0, len(rows))
	for _, row := range rows {
		attempts = append(attempts, dtos.AssignmentAttempt{
			CorrectQuestions: int(row.CorrectQuestions),
			TotalQuestions:   int(row.TotalQuestions),
			Accuracy:         int(row.Accuracy),
			NotesPerMinute:   int(row.NotesPerMinute),
			AttemptedDate:    row.AttemptedDate,
		})
	}
	return attempts, nil
}

// DeleteAssignment removes an assignment on a class the caller owns.
// Tagged entries survive (assignment_id is set null by the FK).
func DeleteAssignment(ctx context.Context, q generated.Querier, teacherID, assignmentID int) error {
	assignment, err := q.GetAssignmentByID(ctx, int32(assignmentID))
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}
	if _, err := requireClassOwner(ctx, q, teacherID, int(assignment.ClassID)); err != nil {
		return err
	}

	if err := q.DeleteAssignment(ctx, int32(assignmentID)); err != nil {
		logger.Error("Failed to delete assignment",
			"error", err.Error(),
			"assignment_id", assignmentID)
		return err
	}
	logger.Info("Assignment deleted",
		"assignment_id", assignmentID,
		"teacher_id", teacherID)
	return nil
}

// ValidateEntryAssignment checks that a score entry may be tagged with
// an assignment: it must exist, belong to a class the student is in,
// and be for the same game the entry records.
func ValidateEntryAssignment(ctx context.Context, q generated.Querier, studentID, assignmentID int, gameType string) error {
	row, err := q.GetAssignmentEnrollment(ctx, generated.GetAssignmentEnrollmentParams{
		ID:        int32(assignmentID),
		StudentID: int32(studentID),
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrValidation
		}
		return err
	}

	if row.GameType != gameType {
		return ErrValidation
	}
	if !row.Enrolled {
		return ErrForbidden
	}
	return nil
}
