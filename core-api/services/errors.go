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
	return fmt.Errorf("%w: %s", ErrValidation, err)
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
