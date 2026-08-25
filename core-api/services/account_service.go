package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"sight-reading/database/generated"
	"sight-reading/logger"

	dtos "sight-reading/DTOs"

	"golang.org/x/crypto/bcrypt"
)

// ChangePassword re-authenticates the caller with their current password
// and, on success, replaces it with the new one.
//
// The current-password check is the same bcrypt compare Login uses, but
// nothing here touches the lockout counters on a mismatch: this is a
// re-auth check inside a session a JWT has already authenticated, not a
// sign-in attempt, and ErrIncorrectPassword (mapped to 400, not 401 --
// see the controller's respondAccountError) is the failure the caller
// gets instead.
func ChangePassword(ctx context.Context, q generated.Querier, userID int, req dtos.ChangePasswordRequest) error {
	user, err := q.GetUserCredentials(ctx, int32(userID))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("look up user credentials: %w", err)
	}

	if user.Password == "" {
		return ErrNoPasswordSet
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
		return ErrIncorrectPassword
	}

	hashed, err := HashPassword(req.NewPassword)
	if err != nil {
		return fmt.Errorf("%w: %w", ErrPasswordHashFailed, err)
	}

	if err := q.UpdateUserPassword(ctx, generated.UpdateUserPasswordParams{
		ID:       user.ID,
		Password: sql.NullString{String: hashed, Valid: true},
	}); err != nil {
		logger.Error("Failed to update password", "error", err.Error(), "user_id", userID)
		return fmt.Errorf("update user password: %w", err)
	}

	// Best-effort cleanup below, same reasoning as ResetPassword's: the
	// password IS already changed by this point, so a failure clearing
	// these is logged and swallowed rather than surfaced as a failed
	// password change.

	// A deliberate change from inside the session kills any outstanding
	// reset link -- one fewer way into the account than the owner just
	// chose to leave open.
	if err := q.InvalidateUserPasswordResetTokens(ctx, user.ID); err != nil {
		logger.Error("Failed to invalidate password reset tokens after a password change", "error", err.Error(), "user_id", userID)
	}

	if err := q.ResetLockout(ctx, user.Email); err != nil {
		logger.Error("Failed to clear lockout after a password change", "error", err.Error(), "user_id", userID)
	}

	return nil
}
