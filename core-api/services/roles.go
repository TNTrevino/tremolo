package services

import (
	"context"
	"database/sql"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
)

// RequireAdmin verifies the authenticated user has the ADMIN role. The
// JWT only carries the user ID, so this is a DB check (see
// requireTeacher for the class-scoped variant). An unknown user maps to
// ErrForbidden; any other lookup failure is returned as-is so callers
// can treat it as a server error rather than a permissions problem.
func RequireAdmin(ctx context.Context, q generated.Querier, userID int) error {
	role, err := q.GetUserRole(ctx, int32(userID))
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrForbidden
		}
		return err
	}
	if role != string(dtos.Admin) {
		return ErrForbidden
	}
	return nil
}
