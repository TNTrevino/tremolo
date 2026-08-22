package services

import (
	"errors"
	"fmt"
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
	// ErrNotFound means the target class/assignment/join code does not exist.
	ErrNotFound = errors.New("not found")
)
