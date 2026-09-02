package services

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/url"
	"os"
	"time"

	"sight-reading/database/generated"
	"sight-reading/logger"

	dtos "sight-reading/DTOs"
)

const (
	// VerifyEmailTokenTTL is how long a minted verify-email token stays
	// redeemable. Generous on purpose: a verification link is a
	// convenience, not a credential, and a student may not open their
	// mail for a day. The copy in the verify-email mail template says
	// "24 hours" (email_service.go's verifyEmailExpiresIn) -- if this
	// ever changes, that string has to change with it.
	VerifyEmailTokenTTL = 24 * time.Hour

	// PurposeVerifyEmail is the email_tokens.purpose value for a signup
	// verification link.
	PurposeVerifyEmail = "verify_email"

	// PurposeChangeEmail is the email_tokens.purpose value for the
	// email-change flow. Declared here (not just in the migration's CHECK
	// constraint) so #249 has a constant to reuse instead of a second
	// hand-typed string; written by #249.
	PurposeChangeEmail = "change_email"
)

// SendVerificationEmail mints a fresh verify-email token and enqueues the
// confirmation mail. Any outstanding verify-email token for userID is
// invalidated first, so only the newest mailed link ever works -- pressing
// "resend" twice must not leave two live links for the same address.
//
// email and firstName come from the caller rather than being looked up
// again here: Register already has the just-created row, and
// ResendVerification already has to look the user up for the
// already-verified check.
func SendVerificationEmail(ctx context.Context, q generated.Querier, userID int, email, firstName string) error {
	if err := q.InvalidateEmailTokens(ctx, generated.InvalidateEmailTokensParams{
		UserID:  int32(userID),
		Purpose: PurposeVerifyEmail,
	}); err != nil {
		logger.Error("Failed to invalidate previous verification tokens", "error", err.Error(), "user_id", userID)
		return fmt.Errorf("invalidate previous verification tokens: %w", err)
	}

	// NewResetToken/HashResetToken are password_reset_service.go's
	// exported helpers, reused rather than duplicated: the algorithm
	// (32 bytes of crypto/rand, sha256 for storage) applies equally to
	// any bearer token this service mints, not just a password reset.
	token, hash, err := NewResetToken()
	if err != nil {
		logger.Error("Failed to generate a verification token", "error", err.Error())
		return fmt.Errorf("generate verification token: %w", err)
	}

	if _, err := q.CreateEmailToken(ctx, generated.CreateEmailTokenParams{
		UserID:    int32(userID),
		Purpose:   PurposeVerifyEmail,
		TokenHash: hash,
		Email:     email,
		ExpiresAt: time.Now().Add(VerifyEmailTokenTTL),
	}); err != nil {
		logger.Error("Failed to store verification token", "error", err.Error())
		return fmt.Errorf("store verification token: %w", err)
	}

	// toName is just firstName: this function is only ever handed a first
	// name, and the template greets by first name too (see
	// email/templates/verify-email.html and .txt).
	return EnqueueVerifyEmail(ctx, q, email, firstName, firstName, verifyEmailURL(token))
}

// VerifyEmail redeems a token minted by SendVerificationEmail.
//
// The token is consumed FIRST, before email_verified_at is touched -- same
// ordering as ResetPassword, and the same reason: consuming it is what
// makes it single-use, and doing that update last would leave a replayable
// token sitting around if MarkEmailVerified failed partway through. A
// MarkEmailVerified failure here is surfaced to the caller (not
// log-and-swallow like the OAuth flows' best-effort calls), because
// verifying the address is this function's entire job rather than
// bookkeeping alongside some other operation that already succeeded; the
// token being burned in that rare case is the safer failure to have, and
// pressing "resend" mints a fresh one.
func VerifyEmail(ctx context.Context, q generated.Querier, req dtos.VerifyEmailRequest) error {
	row, err := q.ConsumeEmailToken(ctx, generated.ConsumeEmailTokenParams{
		TokenHash: HashResetToken(req.Token),
		Purpose:   PurposeVerifyEmail,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrEmailTokenInvalid
		}
		logger.Error("Failed to consume email verification token", "error", err.Error())
		return fmt.Errorf("consume email verification token: %w", err)
	}

	if err := q.MarkEmailVerified(ctx, row.UserID); err != nil {
		logger.Error("Failed to mark email verified", "error", err.Error(), "user_id", row.UserID)
		return fmt.Errorf("mark email verified: %w", err)
	}

	return nil
}

// ResendVerification re-sends the verification mail for the authenticated
// caller. An already-verified account is a no-op that still answers
// success (safe to press twice, and it must not leak whether the account
// was already verified through a different response).
//
// There is no rate limiting here yet -- that is #103. Until it lands,
// pressing resend repeatedly just keeps invalidating the previous link and
// mailing a new one.
func ResendVerification(ctx context.Context, q generated.Querier, userID int) error {
	user, err := q.GetUserByID(ctx, int32(userID))
	if err != nil {
		logger.Error("Failed to look up user for resend verification", "error", err.Error(), "user_id", userID)
		return fmt.Errorf("look up user for resend verification: %w", err)
	}

	if user.EmailVerifiedAt.Valid {
		return nil
	}

	return SendVerificationEmail(ctx, q, userID, user.Email.String, user.FirstName)
}

// RequireEmailVerification reports whether Login should reject an
// unverified account. Default false: verification is soft for the pilot
// (#108) -- signup mails a link and a banner nudges an unverified
// signed-in user, but nothing is blocked until this is explicitly turned
// on with REQUIRE_EMAIL_VERIFICATION=true.
func RequireEmailVerification() bool {
	return os.Getenv("REQUIRE_EMAIL_VERIFICATION") == "true"
}

// verifyEmailURL builds the link mailed to a new signup. The token is
// query-escaped for the same reason passwordResetURL escapes its token:
// not because base64.RawURLEncoding's alphabet needs it, but so this stays
// correct if the token encoding ever changes.
func verifyEmailURL(token string) string {
	return PublicBaseURL() + "/verify-email?token=" + url.QueryEscape(token)
}
