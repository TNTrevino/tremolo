// Package validations contains any form of validations that the application
// uses. This is currently not true and maybe we need to rename this module
package validations

import (
	"fmt"
	"net/url"
	"regexp"
	"unicode"
)

// The rules below are plain predicates over a string. A request DTO calls
// them from its Valid method; nothing registers them with a framework.

// entryTimePattern is deliberately unanchored, and EntryTimeLength
// requires exactly one match. That is the rule this service has always
// applied, so it is kept as-is: anchoring it would newly reject strings
// with a valid time embedded in them.
var entryTimePattern = regexp.MustCompile("([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]")

// EntryTimeLength reports whether s holds exactly one military-format
// time.
func EntryTimeLength(s string) bool {
	return len(entryTimePattern.FindAllString(s, -1)) == 1
}

// VarChar255Length reports whether s fits the varchar(255) columns the
// user and school tables use. An empty string fits; presence is a
// separate rule.
func VarChar255Length(s string) bool {
	return len(s) <= 255
}

// UserRole reports whether s is one of the four roles the users table
// accepts.
func UserRole(s string) bool {
	switch s {
	case "TEACHER", "STUDENT", "PARENT", "ADMIN":
		return true
	}

	return false
}

var (
	hasUpper   = regexp.MustCompile(`[A-Z]`)
	hasLower   = regexp.MustCompile(`[a-z]`)
	hasNumber  = regexp.MustCompile(`[0-9]`)
	hasSpecial = regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]`)
)

// PasswordComplexity reports whether s holds at least one uppercase
// letter, one lowercase letter, one digit and one special character.
func PasswordComplexity(s string) bool {
	return hasUpper.MatchString(s) &&
		hasLower.MatchString(s) &&
		hasNumber.MatchString(s) &&
		hasSpecial.MatchString(s)
}

// IsAlpha reports whether s is a non-empty run of ASCII letters. This is
// what the "alpha" struct tag meant: it is ASCII-only, so an accented
// name fails it. That is existing behavior, not a new restriction.
func IsAlpha(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if (r < 'a' || r > 'z') && (r < 'A' || r > 'Z') {
			return false
		}
	}
	return true
}

// IsAlphaNumUnicode reports whether s is a non-empty run of Unicode
// letters and numbers, matching the \p{L}\p{N} class the
// "alphanumunicode" tag used.
func IsAlphaNumUnicode(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if !unicode.IsLetter(r) && !unicode.IsNumber(r) {
			return false
		}
	}
	return true
}

// emailPattern is loose on purpose: one @, no whitespace, and a dot in
// the domain. The library's regexp was stricter about the local part and
// looser about the domain -- it accepted "user@localhost". Requiring the
// dot is the one deliberate tightening here, because this service only
// ever mails real addresses.
var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

// IsEmail reports whether s looks like an email address.
func IsEmail(s string) bool {
	return emailPattern.MatchString(s)
}

// IsURL reports whether s is an absolute URL with a scheme and a host.
// The one caller is the Google OAuth redirect_uri.
func IsURL(s string) bool {
	u, err := url.ParseRequestURI(s)
	if err != nil {
		return false
	}
	return u.Scheme != "" && u.Host != ""
}

// ValidateChartInterval validates chart interval parameter
// Valid values: day, week, month, year (for date_trunc), all (no time constraint)
// This prevents invalid data from reaching the database layer
// Returns error if interval is invalid, nil otherwise
func ValidateChartInterval(interval string) error {
	validIntervals := map[string]bool{
		"day":   true,
		"week":  true,
		"month": true,
		"year":  true,
		"all":   true,
	}
	if !validIntervals[interval] {
		return fmt.Errorf("invalid interval '%s': must be one of: day, week, month, year, all", interval)
	}
	return nil
}
