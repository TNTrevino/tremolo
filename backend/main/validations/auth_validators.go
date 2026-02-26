package validations

import (
	"context"
	"database/sql"
	"fmt"
	"sight-reading/database"
)

// ValidateTeacherRole checks if a user has the "teacher" role
// Returns nil if the user is a teacher, error otherwise
// This should be called after authenticating the user
func ValidateTeacherRole(ctx context.Context, userID int) error {
	userRole, err := database.Queries.GetUserRole(ctx, int32(userID))
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to verify user role: %w", err)
	}

	if !userRole.Valid || userRole.String != "teacher" {
		return fmt.Errorf("access denied: only teachers can access this resource")
	}

	return nil
}

// Role represents the possible user roles in the system
type Role string

const (
	RoleTeacher Role = "teacher"
	RoleStudent Role = "student"
	RoleParent  Role = "parent"
	RoleAdmin   Role = "admin"
)

// ValidateUserRole checks if a user has a specific role
// Returns nil if the user has the required role, error otherwise
func ValidateUserRole(ctx context.Context, userID int, requiredRole Role) error {
	userRole, err := database.Queries.GetUserRole(ctx, int32(userID))
	if err != nil {
		if err == sql.ErrNoRows {
			return fmt.Errorf("user not found")
		}
		return fmt.Errorf("failed to verify user role: %w", err)
	}

	if !userRole.Valid || userRole.String != string(requiredRole) {
		return fmt.Errorf("access denied: user does not have required role '%s'", requiredRole)
	}

	return nil
}
