// Package validations contains any form of validations that the application
// uses. This is currently not true and maybe we need to rename this module
package validations

import (
	"fmt"
	"regexp"

	"github.com/go-playground/validator/v10"
)

func EntryTimeLength(fl validator.FieldLevel) bool {
	r := regexp.MustCompile("([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]")
	// -1 returns all matches, so we also need to make sure that is one
	matches := r.FindAllString(fl.Field().String(), -1)

	if len(matches) != 1 {
		return false
	} else {
		return true
	}
}

func VarChar255Length(fl validator.FieldLevel) bool {
	if len(fl.Field().String()) > 255 {
		return false
	} else {
		return true
	}
}

// UserRole youtube custom validation
func UserRole(fl validator.FieldLevel) bool {
	switch fl.Field().String() {
	case "TEACHER", "STUDENT", "ADMIN":
		return true
	}

	return false
}

func PasswordComplexity(fl validator.FieldLevel) bool {
	password := fl.Field().String()

	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
	hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
	hasSpecial := regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]`).MatchString(password)

	return hasUpper && hasLower && hasNumber && hasSpecial
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
