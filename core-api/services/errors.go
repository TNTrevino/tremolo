package services

import (
	"errors"
	"fmt"
	"time"
)

// validationErr wraps a DTO validation failure so callers can match it
// with errors.Is(err, ErrValidation) (controllers map it to 400) while
// the wrapped message keeps the offending field detail for logs.
func validationErr(err error) error {
	return fmt.Errorf("%w: %w", ErrValidation, err)
}

// Shared error sentinels for the service layer. Controllers map these
// onto HTTP statuses (see respondClassError and the game controllers),
// so keep the vocabulary in one place rather than per-feature.
var (
	// ErrValidation means the request failed a business/shape rule.
	ErrValidation = errors.New("validation failed")
	// ErrUnauthorized means the caller acted on another user's data
	// (e.g. saving an entry under a different user_id).
	ErrUnauthorized = errors.New("access denied: user cannot act for another user")
	// ErrForbidden means the caller lacks the role or ownership the
	// action requires (wrong role, or not the owning teacher).
	ErrForbidden = errors.New("forbidden")
	// ErrNotFound means the target class/assignment/join code (or, for
	// auth, the authenticated caller's own user row) does not exist.
	ErrNotFound = errors.New("not found")

	// ErrInvalidCredentials means an email/password login did not match
	// a user record: unknown email, wrong password, or an account with
	// no password set (e.g. a Google-only account).
	ErrInvalidCredentials = errors.New("invalid credentials")
	// ErrAccountLocked means a login was attempted against an account
	// that is already locked from prior failed attempts.
	ErrAccountLocked = errors.New("account locked")
	// ErrEmailTaken means registration was attempted with an email that
	// already has an account.
	ErrEmailTaken = errors.New("email already exists")
	// ErrInvalidRole means registration was attempted with a role the
	// roles table doesn't recognize.
	ErrInvalidRole = errors.New("invalid role")
	// ErrInvalidInviteCode means a TEACHER signup presented a code that
	// does not exist, has expired, or has no uses left. The three are
	// deliberately indistinguishable to the caller.
	ErrInvalidInviteCode = errors.New("invalid teacher invite code")
	// ErrInvalidRefreshToken means the supplied refresh token failed
	// signature or expiry validation.
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
	// ErrWrongTokenType means a token of the wrong type (e.g. an access
	// token) was presented where a refresh token was required.
	ErrWrongTokenType = errors.New("wrong token type")
	// ErrLockCheckFailed means checking whether a login's target
	// account is locked hit an unexpected database error.
	ErrLockCheckFailed = errors.New("failed to check account lock status")
	// ErrUserLookupFailed means looking up a user by email during login
	// hit an unexpected database error.
	ErrUserLookupFailed = errors.New("failed to look up user by email")
	// ErrEmailCheckFailed means checking whether an email is already
	// registered (during registration) hit an unexpected database error.
	ErrEmailCheckFailed = errors.New("failed to check existing email")
	// ErrPasswordHashFailed means hashing a new user's password failed.
	ErrPasswordHashFailed = errors.New("failed to hash password")
	// ErrUserCreateFailed means inserting a new user row failed.
	ErrUserCreateFailed = errors.New("failed to create user")
	// ErrAccessTokenGeneration means minting a JWT access token failed.
	ErrAccessTokenGeneration = errors.New("failed to generate access token")
	// ErrRefreshTokenGeneration means minting a JWT refresh token failed.
	ErrRefreshTokenGeneration = errors.New("failed to generate refresh token")

	// ErrGoogleExchangeFailed means exchanging a Google authorization code
	// for an ID token failed (bad code, wrong redirect URI, network error).
	ErrGoogleExchangeFailed = errors.New("failed to exchange google authorization code")
	// ErrGoogleTokenInvalid means the Google ID token failed signature or
	// audience verification.
	ErrGoogleTokenInvalid = errors.New("invalid google id token")
	// ErrGoogleEmailUnverified means the Google account's email address
	// has not been verified with Google.
	ErrGoogleEmailUnverified = errors.New("google email is not verified")
	// ErrGoogleEmailAlreadyLinked means the OAuth callback's email belongs
	// to a user who already has a *different* Google account linked.
	ErrGoogleEmailAlreadyLinked = errors.New("email already linked to a different google account")
	// ErrGoogleLinkFailed means persisting a Google ID onto a user row
	// failed, whether from the auto-link path in the OAuth callback or
	// from the explicit LinkGoogleAccount flow.
	ErrGoogleLinkFailed = errors.New("failed to link google account")
	// ErrGoogleUserCreateFailed means inserting a new OAuth user row
	// failed.
	ErrGoogleUserCreateFailed = errors.New("failed to create oauth user")
	// ErrGoogleEmailMismatch means the authenticated caller's email does
	// not match the Google account's email during LinkGoogleAccount.
	ErrGoogleEmailMismatch = errors.New("google email does not match account email")
	// ErrGoogleIDConflict means the Google account being linked is already
	// linked to a different user.
	ErrGoogleIDConflict = errors.New("google account already linked to another user")

	// ErrResetTokenInvalid means a password reset token was unknown,
	// already used, or expired. The three cases are deliberately
	// indistinguishable: ConsumePasswordResetToken's WHERE clause folds
	// them into the same sql.ErrNoRows, and telling them apart in the
	// response would hand an attacker information a generic 400 does not.
	ErrResetTokenInvalid = errors.New("invalid or expired password reset token")

	// ErrEmailTokenInvalid means an email_tokens row (verify_email or
	// change_email) was unknown, already used, or expired.
	// ConsumeEmailToken's WHERE clause folds all three into the same
	// sql.ErrNoRows -- deliberately indistinguishable, same reasoning as
	// ErrResetTokenInvalid.
	ErrEmailTokenInvalid = errors.New("invalid or expired email token")
	// ErrEmailNotVerified means REQUIRE_EMAIL_VERIFICATION is on and the
	// account attempting to log in has not confirmed its email address.
	ErrEmailNotVerified = errors.New("email address not verified")

	// ErrIncorrectPassword means a re-authentication check INSIDE an
	// already-authenticated session (ChangePassword, RequestEmailChange)
	// failed: the caller's JWT is valid, but the current-password they
	// supplied to authorize the change does not match. Deliberately
	// distinct from ErrInvalidCredentials, which is a failed sign-in --
	// the controller maps this one to 400, not 401 (see
	// respondAccountError's doc comment for why 401 specifically is
	// unsafe here).
	ErrIncorrectPassword = errors.New("incorrect password")
	// ErrNoPasswordSet means the account authenticates through Google and
	// has no password to check against (ChangePassword, RequestEmailChange).
	ErrNoPasswordSet = errors.New("account has no password set")
	// ErrEmailManagedByGoogle means the account's email address IS its
	// Google identity, so RequestEmailChange has no address to move: the
	// address the caller would be "changing" is the one Google
	// authenticates them as.
	ErrEmailManagedByGoogle = errors.New("email address is managed by google")
)

// LockoutTriggeredError is returned by Login when a failed attempt is
// the one that pushes an account over MaxLoginAttempts and locks it. It
// carries the lockout duration so the controller can render the
// user-facing message ("Account locked for N minutes...") with the
// correct value without re-deriving it.
type LockoutTriggeredError struct {
	Duration time.Duration
}

func (e *LockoutTriggeredError) Error() string {
	return fmt.Sprintf("Account locked for %d minutes due to too many failed login attempts", int(e.Duration.Minutes()))
}
