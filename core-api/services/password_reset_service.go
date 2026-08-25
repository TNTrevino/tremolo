package services

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"time"

	"sight-reading/database/generated"
	"sight-reading/logger"

	dtos "sight-reading/DTOs"
)

const (
	// PasswordResetTokenTTL is how long a minted reset token stays
	// redeemable. The copy in the password-reset mail template says "1
	// hour" (email_service.go's passwordResetExpiresIn) -- if this ever
	// changes, that string has to change with it.
	PasswordResetTokenTTL = time.Hour

	// resetTokenBytes is the amount of randomness in a reset token: 32
	// bytes from crypto/rand is 256 bits, far past what is guessable.
	resetTokenBytes = 32
)

// RequestPasswordReset never reveals whether an account exists for the
// requested address: the controller answers 200 with an identical message
// for every outcome below, and the only errors returned here are
// infrastructure failures (a database error, a broken template). Those
// leak nothing about the address either -- the controller's failure
// branch answers the same account-independent way success does, so even
// an outage says nothing about whether the address has an account.
//
// Three outcomes, all answered identically by the caller:
//   - no account for the address: nothing is enqueued.
//   - an account with a password: a normal reset-link mail.
//   - a Google-only account (no password, google_id set): the
//     Google-notice mail, via EnqueuePasswordResetGoogle -- so a Google
//     user who mistakenly asks for a reset is never left staring at an
//     empty inbox wondering whether the request even went through.
func RequestPasswordReset(ctx context.Context, q generated.Querier, req dtos.ForgotPasswordRequest) error {
	normalizedEmail := normalizeEmail(req.Email)
	emailNullStr := sql.NullString{String: normalizedEmail, Valid: true}

	user, err := q.GetUserByEmailForOAuth(ctx, emailNullStr)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil
		}
		logger.Error("Failed to look up user for password reset", "error", err.Error())
		return fmt.Errorf("%w: %w", ErrUserLookupFailed, err)
	}

	toName := user.FirstName + " " + user.LastName

	if user.Password == "" {
		if !user.GoogleID.Valid {
			// No password AND no linked Google account shouldn't happen in
			// practice, but say nothing either way -- there is no reset
			// link to offer, and this function never reveals account
			// shape to its caller.
			return nil
		}

		return EnqueuePasswordResetGoogle(ctx, q, user.Email.String, toName, user.FirstName)
	}

	token, hash, err := NewResetToken()
	if err != nil {
		logger.Error("Failed to generate a password reset token", "error", err.Error())
		return fmt.Errorf("generate password reset token: %w", err)
	}

	if err := q.CreatePasswordResetToken(ctx, generated.CreatePasswordResetTokenParams{
		UserID:    user.ID,
		TokenHash: hash,
		ExpiresAt: time.Now().Add(PasswordResetTokenTTL),
	}); err != nil {
		logger.Error("Failed to store password reset token", "error", err.Error())
		return fmt.Errorf("store password reset token: %w", err)
	}

	return EnqueuePasswordReset(ctx, q, user.Email.String, toName, user.FirstName, passwordResetURL(token))
}

// ResetPassword redeems a token minted by RequestPasswordReset.
//
// The token is burned FIRST, before the password is touched: consuming it
// is what makes it single-use, and doing that update last would leave a
// replayable token sitting around if the password update failed partway
// through. Cleanup after the burn -- invalidating the user's other open
// tokens, clearing the lockout -- is best-effort and log-and-swallow: the
// password IS already changed by that point, and a user who still can't
// sign in because of a stale lockout or a second live link can always ask
// for another reset.
func ResetPassword(ctx context.Context, q generated.Querier, req dtos.ResetPasswordRequest) error {
	userID, err := q.ConsumePasswordResetToken(ctx, HashResetToken(req.Token))
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrResetTokenInvalid
		}
		logger.Error("Failed to consume password reset token", "error", err.Error())
		return fmt.Errorf("consume password reset token: %w", err)
	}

	hashed, err := HashPassword(req.Password)
	if err != nil {
		return fmt.Errorf("%w: %w", ErrPasswordHashFailed, err)
	}

	if err := q.UpdateUserPassword(ctx, generated.UpdateUserPasswordParams{
		ID:       userID,
		Password: sql.NullString{String: hashed, Valid: true},
	}); err != nil {
		logger.Error("Failed to update password after reset", "error", err.Error())
		return fmt.Errorf("update user password: %w", err)
	}

	if err := q.InvalidateUserPasswordResetTokens(ctx, userID); err != nil {
		logger.Error("Failed to invalidate other password reset tokens", "error", err.Error(), "user_id", userID)
	}

	if user, err := q.GetUserByID(ctx, userID); err != nil {
		logger.Error("Failed to look up user to clear lockout after reset", "error", err.Error(), "user_id", userID)
	} else if err := q.ResetLockout(ctx, user.Email); err != nil {
		logger.Error("Failed to clear lockout after password reset", "error", err.Error(), "user_id", userID)
	}

	return nil
}

// NewResetToken mints a fresh reset token and returns both the plaintext
// (mailed to the user, never stored) and its sha256 hash (stored, never
// mailed) -- see the 00013 migration's comment for why sha256 rather than
// a slow password hash. Exported so tests can mint a token through the
// same algorithm the service uses, rather than a second copy of it.
func NewResetToken() (token, hash string, err error) {
	raw := make([]byte, resetTokenBytes)
	if _, err := rand.Read(raw); err != nil {
		return "", "", fmt.Errorf("generate random token: %w", err)
	}

	token = base64.RawURLEncoding.EncodeToString(raw)
	return token, HashResetToken(token), nil
}

// HashResetToken sha256-hashes a plaintext token for storage or lookup.
func HashResetToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// passwordResetURL builds the link mailed to the user. The token is
// query-escaped -- not because base64.RawURLEncoding's alphabet needs it
// (it is already URL-safe), but because escaping it here rather than
// trusting the alphabet keeps this correct if the encoding ever changes.
func passwordResetURL(token string) string {
	return PublicBaseURL() + "/reset-password?token=" + url.QueryEscape(token)
}
