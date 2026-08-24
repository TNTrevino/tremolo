package services

import (
	"context"
	"crypto/rand"
	"database/sql"
	"errors"
	"strings"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"

	"github.com/lib/pq"
)

// joinCodeAlphabet omits ambiguous characters (0/O, 1/I/L) so codes
// survive being read aloud in a classroom or copied off a whiteboard.
const joinCodeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

const joinCodeMaxAttempts = 5

func generateJoinCode() (string, error) {
	buf := make([]byte, dtos.JoinCodeLength)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	for i, b := range buf {
		buf[i] = joinCodeAlphabet[int(b)%len(joinCodeAlphabet)]
	}
	return string(buf), nil
}

func isUniqueViolation(err error) bool {
	var pqErr *pq.Error
	return errors.As(err, &pqErr) && pqErr.Code == "23505"
}

// requireTeacher verifies the authenticated user has the TEACHER (or
// ADMIN) role. The JWT only carries the user ID, so this is a DB check.
func requireTeacher(ctx context.Context, q generated.Querier, userID int) error {
	role, err := q.GetUserRole(ctx, int32(userID))
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrForbidden
		}
		return err
	}
	if role != string(dtos.Teacher) && role != string(dtos.Admin) {
		return ErrForbidden
	}
	return nil
}

// requireClassOwner fetches a class and verifies the caller owns it.
func requireClassOwner(ctx context.Context, q generated.Querier, userID, classID int) (generated.TremoloClass, error) {
	class, err := q.GetClassByID(ctx, int32(classID))
	if err != nil {
		if err == sql.ErrNoRows {
			return generated.TremoloClass{}, ErrNotFound
		}
		return generated.TremoloClass{}, err
	}
	if int(class.TeacherID) != userID {
		return generated.TremoloClass{}, ErrForbidden
	}
	return class, nil
}

// CreateClass creates a class owned by the authenticated teacher, with
// a freshly generated join code (retrying on the rare collision).
func CreateClass(ctx context.Context, q generated.Querier, teacherID int, req *dtos.CreateClassRequest) (*dtos.ClassResponse, error) {
	if err := requireTeacher(ctx, q, teacherID); err != nil {
		return nil, err
	}

	for attempt := 0; attempt < joinCodeMaxAttempts; attempt++ {
		code, err := generateJoinCode()
		if err != nil {
			return nil, err
		}

		class, err := q.CreateClass(ctx, generated.CreateClassParams{
			TeacherID: int32(teacherID),
			Name:      strings.TrimSpace(req.Name),
			JoinCode:  code,
		})
		if err != nil {
			if isUniqueViolation(err) {
				continue
			}
			logger.Error("Failed to create class",
				"error", err.Error(),
				"teacher_id", teacherID)
			return nil, err
		}

		logger.Info("Class created",
			"class_id", class.ID,
			"teacher_id", teacherID)
		return &dtos.ClassResponse{
			ID:           int(class.ID),
			Name:         class.Name,
			JoinCode:     class.JoinCode,
			StudentCount: 0,
			CreatedAt:    class.CreatedAt,
		}, nil
	}

	return nil, errors.New("could not generate a unique join code")
}

// ListTeacherClasses returns the caller's active classes with rosters
// counted.
func ListTeacherClasses(ctx context.Context, q generated.Querier, teacherID int) ([]dtos.ClassResponse, error) {
	rows, err := q.ListClassesByTeacher(ctx, int32(teacherID))
	if err != nil {
		logger.Error("Failed to list teacher classes",
			"error", err.Error(),
			"teacher_id", teacherID)
		return nil, err
	}

	classes := make([]dtos.ClassResponse, 0, len(rows))
	for _, row := range rows {
		classes = append(classes, dtos.ClassResponse{
			ID:           int(row.ID),
			Name:         row.Name,
			JoinCode:     row.JoinCode,
			StudentCount: int(row.StudentCount),
			CreatedAt:    row.CreatedAt,
		})
	}
	return classes, nil
}

// ListStudentClasses returns the classes the caller has joined.
func ListStudentClasses(ctx context.Context, q generated.Querier, studentID int) ([]dtos.StudentClassResponse, error) {
	rows, err := q.ListClassesByStudent(ctx, int32(studentID))
	if err != nil {
		logger.Error("Failed to list student classes",
			"error", err.Error(),
			"student_id", studentID)
		return nil, err
	}

	classes := make([]dtos.StudentClassResponse, 0, len(rows))
	for _, row := range rows {
		classes = append(classes, dtos.StudentClassResponse{
			ID:          int(row.ID),
			Name:        row.Name,
			TeacherName: row.TeacherFirstName + " " + row.TeacherLastName,
		})
	}
	return classes, nil
}

// JoinClass adds the authenticated user to the class matching the join
// code. Joining twice is a no-op, so students can safely re-enter a code.
func JoinClass(ctx context.Context, q generated.Querier, studentID int, req *dtos.JoinClassRequest) (*dtos.StudentClassResponse, error) {
	class, err := q.GetClassByJoinCode(ctx, normalizeJoinCode(req.JoinCode))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		logger.Error("Failed to look up join code", "error", err.Error())
		return nil, err
	}

	// Teachers (including the owner) have no business on a roster.
	if int(class.TeacherID) == studentID {
		return nil, ErrForbidden
	}

	err = q.AddStudentToClass(ctx, generated.AddStudentToClassParams{
		ClassID:   class.ID,
		StudentID: int32(studentID),
	})
	if err != nil {
		logger.Error("Failed to join class",
			"error", err.Error(),
			"class_id", class.ID,
			"student_id", studentID)
		return nil, err
	}

	logger.Info("Student joined class",
		"class_id", class.ID,
		"student_id", studentID)
	return &dtos.StudentClassResponse{
		ID:   int(class.ID),
		Name: class.Name,
	}, nil
}

// normalizeJoinCode uppercases and strips spaces so codes are
// case-insensitive for students typing them in.
func normalizeJoinCode(code string) string {
	return strings.ToUpper(strings.ReplaceAll(code, " ", ""))
}

// GetClassRoster returns the students in a class the caller owns.
func GetClassRoster(ctx context.Context, q generated.Querier, teacherID, classID int) ([]dtos.RosterEntryResponse, error) {
	if _, err := requireClassOwner(ctx, q, teacherID, classID); err != nil {
		return nil, err
	}

	rows, err := q.ListClassRoster(ctx, int32(classID))
	if err != nil {
		logger.Error("Failed to list class roster",
			"error", err.Error(),
			"class_id", classID)
		return nil, err
	}

	roster := make([]dtos.RosterEntryResponse, 0, len(rows))
	for _, row := range rows {
		roster = append(roster, dtos.RosterEntryResponse{
			StudentID: int(row.ID),
			FirstName: row.FirstName,
			LastName:  row.LastName,
			JoinedAt:  row.JoinedAt,
		})
	}
	return roster, nil
}

// RemoveStudentFromClass lets the owning teacher remove a student, or a
// student remove themselves (leave the class).
func RemoveStudentFromClass(ctx context.Context, q generated.Querier, callerID, classID, studentID int) error {
	if callerID != studentID {
		if _, err := requireClassOwner(ctx, q, callerID, classID); err != nil {
			return err
		}
	}

	err := q.RemoveStudentFromClass(ctx, generated.RemoveStudentFromClassParams{
		ClassID:   int32(classID),
		StudentID: int32(studentID),
	})
	if err != nil {
		logger.Error("Failed to remove student from class",
			"error", err.Error(),
			"class_id", classID,
			"student_id", studentID)
	}
	return err
}

// ArchiveClass soft-deletes a class the caller owns. Assignments and
// entries stay for historical reporting; the class just stops being active.
func ArchiveClass(ctx context.Context, q generated.Querier, teacherID, classID int) error {
	if _, err := requireClassOwner(ctx, q, teacherID, classID); err != nil {
		return err
	}
	if err := q.ArchiveClass(ctx, int32(classID)); err != nil {
		logger.Error("Failed to archive class",
			"error", err.Error(),
			"class_id", classID)
		return err
	}
	logger.Info("Class archived", "class_id", classID, "teacher_id", teacherID)
	return nil
}
