package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"time"

	"sight-reading/database/generated"
	"sight-reading/logger"

	dtos "sight-reading/DTOs"

	"golang.org/x/crypto/bcrypt"
)

// ChangeEmailTokenTTL is how long a minted change-email token stays
// redeemable. Shorter than VerifyEmailTokenTTL's 24 hours: this token
// moves the account's identity -- a credential-grade action, not the
// signup convenience a verify-email link is.
const ChangeEmailTokenTTL = time.Hour

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

// RequestEmailChange re-authenticates the caller with their current
// password and, on success, mints a change-email token and mails a
// confirm link to the NEW address plus an FYI to the old one.
//
// The account-enumeration tradeoff here is deliberate and different from
// Register's: CountUsersByEmail tells the caller outright whether the
// requested address is already taken (ErrEmailTaken, mapped to 409, not
// folded into a generic response). Register's caller has proven nothing;
// this caller is authenticated AND has just re-proved their current
// password, a meaningfully different threat model where that information
// is a normal validation error, not a leak.
func RequestEmailChange(ctx context.Context, q generated.Querier, userID int, req dtos.ChangeEmailRequest) error {
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

	if user.GoogleID.Valid {
		return ErrEmailManagedByGoogle
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.CurrentPassword)); err != nil {
		return ErrIncorrectPassword
	}

	newEmail := normalizeEmail(req.NewEmail)
	if newEmail == normalizeEmail(user.Email.String) {
		return validationErr(errors.New("new email must differ from the current one"))
	}

	count, err := q.CountUsersByEmail(ctx, sql.NullString{String: newEmail, Valid: true})
	if err != nil {
		logger.Error("Failed to check existing email for a change request", "error", err.Error())
		return fmt.Errorf("check existing email: %w", err)
	}
	if count > 0 {
		return ErrEmailTaken
	}

	// One pending change at a time: a second request supersedes the
	// first, the same "only the newest link works" rule
	// SendVerificationEmail applies to its own tokens.
	if err := q.InvalidateEmailTokens(ctx, generated.InvalidateEmailTokensParams{
		UserID:  user.ID,
		Purpose: PurposeChangeEmail,
	}); err != nil {
		logger.Error("Failed to invalidate previous email-change tokens", "error", err.Error(), "user_id", userID)
		return fmt.Errorf("invalidate previous email-change tokens: %w", err)
	}

	token, hash, err := NewResetToken()
	if err != nil {
		logger.Error("Failed to generate an email-change token", "error", err.Error())
		return fmt.Errorf("generate email-change token: %w", err)
	}

	if _, err := q.CreateEmailToken(ctx, generated.CreateEmailTokenParams{
		UserID:    user.ID,
		Purpose:   PurposeChangeEmail,
		TokenHash: hash,
		Email:     newEmail,
		ExpiresAt: time.Now().Add(ChangeEmailTokenTTL),
	}); err != nil {
		logger.Error("Failed to store email-change token", "error", err.Error())
		return fmt.Errorf("store email-change token: %w", err)
	}

	// The confirmation IS the point of this call -- without it the token
	// exists but the requester has no way to redeem it -- so, unlike the
	// alert below, its failure is surfaced rather than swallowed. Same
	// choice SendVerificationEmail makes for its own confirmation mail.
	if err := EnqueueEmailChange(ctx, q, newEmail, user.FirstName, user.FirstName, newEmail, confirmEmailChangeURL(token)); err != nil {
		logger.Error("Failed to enqueue email-change confirmation", "error", err.Error(), "user_id", userID)
		return fmt.Errorf("enqueue email-change confirmation: %w", err)
	}

	// Best-effort: the OLD address is only being told, not asked to act,
	// so a failure here must not undo -- or even report as failed -- a
	// change the account owner already authorized with their password.
	if user.Email.Valid {
		if err := EnqueueEmailChangeAlert(ctx, q, user.Email.String, user.FirstName, user.FirstName, newEmail); err != nil {
			logger.Error("Failed to enqueue email-change alert to the old address", "error", err.Error(), "user_id", userID)
		}
	}

	return nil
}

// ConfirmEmailChange redeems a token minted by RequestEmailChange.
//
// The token is consumed FIRST, before the address is touched -- same
// ordering as VerifyEmail and ResetPassword, and the same reason:
// consuming it is what makes it single-use.
func ConfirmEmailChange(ctx context.Context, q generated.Querier, req dtos.ConfirmEmailChangeRequest) (*dtos.ConfirmEmailChangeResponse, error) {
	row, err := q.ConsumeEmailToken(ctx, generated.ConsumeEmailTokenParams{
		TokenHash: HashResetToken(req.Token),
		Purpose:   PurposeChangeEmail,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrEmailTokenInvalid
		}
		logger.Error("Failed to consume email-change token", "error", err.Error())
		return nil, fmt.Errorf("consume email-change token: %w", err)
	}

	if err := q.UpdateUserEmail(ctx, generated.UpdateUserEmailParams{
		Email: sql.NullString{String: row.Email, Valid: true},
		ID:    row.UserID,
	}); err != nil {
		if isUniqueViolation(err) {
			// The address was claimed by someone else in the window
			// between request and confirm. The token is already burned
			// above, so the honest answer is "ask again" -- the unique
			// index, not RequestEmailChange's own already-taken check,
			// is the real guarantee here.
			return nil, ErrEmailTaken
		}
		logger.Error("Failed to update user email after confirming a change", "error", err.Error())
		return nil, fmt.Errorf("update user email: %w", err)
	}

	return &dtos.ConfirmEmailChangeResponse{
		Message: "Your email address has been updated.",
		Email:   row.Email,
	}, nil
}

// confirmEmailChangeURL builds the link mailed to the NEW address. The
// token is query-escaped for the same reason passwordResetURL and
// verifyEmailURL escape theirs: not because the encoding needs it today,
// but so this stays correct if it ever changes.
func confirmEmailChangeURL(token string) string {
	return PublicBaseURL() + "/confirm-email-change?token=" + url.QueryEscape(token)
}
