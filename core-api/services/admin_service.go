package services

import (
	"context"
	"database/sql"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

// GetTeachers returns every user with the TEACHER role.
func GetTeachers(ctx context.Context, q generated.Querier) ([]dtos.User, error) {
	users, err := q.GetUsersByRole(ctx, string(dtos.Teacher))
	if err != nil {
		logger.Error("failed to get teachers", "error", err)
		return nil, err
	}
	return convertGetUsersByRoleRowsToDTO(users), nil
}

// GetTeacher returns a single user by ID, regardless of role (mirroring
// the pre-refactor behavior, which looked the user up by ID alone and
// did not verify they were actually a TEACHER). A missing user is
// ErrNotFound.
func GetTeacher(ctx context.Context, q generated.Querier, id int) (*dtos.User, error) {
	user, err := q.GetUserByID(ctx, int32(id))
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		logger.Error("failed to get teacher", "error", err, "id", id)
		return nil, err
	}

	teacher := convertGetUserByIDRowToDTO(user)
	userID := int16(user.ID)
	teacher.ID = &userID
	return &teacher, nil
}
