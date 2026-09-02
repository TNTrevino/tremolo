package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/logger"
)

// CreateUser creates a user (student/teacher/parent) on behalf of an
// admin. The caller's own admin-role check happens above this (see
// controllers.adminOnly / RequireAdmin); this function additionally
// refuses to create ADMIN users -- that's ErrForbidden, which the
// controller maps to a message specific to this endpoint rather than
// the generic "Forbidden" body other handlers use.
//
// The supplied password is hashed with bcrypt (see HashPassword) before
// it reaches the database; it is never stored or echoed back in plain
// text.
func CreateUser(ctx context.Context, q generated.Querier, req *dtos.CreateUserRequest) (*dtos.UserResponse, error) {
	if req.Role == dtos.Admin {
		return nil, ErrForbidden
	}

	roleID, err := q.GetRoleIDByName(ctx, string(req.Role))
	if err != nil {
		logger.Error("Failed to resolve role", "error", err.Error(), "role", req.Role)
		return nil, fmt.Errorf("%w: %w", ErrInvalidRole, err)
	}

	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	params := generated.CreateUserParams{
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Email:     sql.NullString{String: req.Email, Valid: req.Email != ""},
		Password:  sql.NullString{String: passwordHash, Valid: true},
		RoleID:    roleID,
		// GradeLevel is left unset (NULL): an admin-created user has no
		// grade signal by design (#244) -- nobody filled out the signup
		// form that asks for one.
	}

	if req.SchoolID != 0 {
		params.SchoolID = sql.NullInt32{Int32: int32(req.SchoolID), Valid: true}
	}

	createdUser, err := q.CreateUser(ctx, params)
	if err != nil {
		logger.Error("failed to create user", "error", err)
		return nil, err
	}

	response := convertCreateUserRowToUserResponse(createdUser, string(req.Role))
	return &response, nil
}

// GetStudents returns every user with the STUDENT role.
func GetStudents(ctx context.Context, q generated.Querier) ([]dtos.User, error) {
	users, err := q.GetUsersByRole(ctx, string(dtos.Student))
	if err != nil {
		logger.Error("failed to get students", "error", err)
		return nil, err
	}
	return convertGetUsersByRoleRowsToDTO(users), nil
}

// GetStudent returns a single STUDENT-role user by ID. A missing or
// wrong-role user is ErrNotFound.
func GetStudent(ctx context.Context, q generated.Querier, id int) (*dtos.User, error) {
	params := generated.GetUserByRoleAndIDParams{
		Name: string(dtos.Student),
		ID:   int32(id),
	}

	user, err := q.GetUserByRoleAndID(ctx, params)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		logger.Error("failed to get student", "error", err, "id", id)
		return nil, err
	}

	result := convertGetUserByRoleAndIDRowToDTO(user)
	return &result, nil
}
