// Package dtos contains most of the Data Transfer Objects in this application.
// TODO: move validation out of this package into its own package
package dtos

import (
	"context"
	"strings"

	"sight-reading/validations"
)

// LoginRequest represents the request body for user login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (req LoginRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	switch {
	case req.Email == "":
		problems["email"] = "Email is required"
	case !validations.IsEmail(req.Email):
		problems["email"] = "Email must be a valid email address"
	}

	return addPasswordProblem(problems, req.Password)
}

// addPasswordProblem applies the password rules Login and Register share.
// Both routes must reject the same passwords, and the copy is the same
// sentence on each, so the rule lives once.
//
// The upper bound is bcrypt's, not a policy choice: bcrypt.GenerateFromPassword
// errors with ErrPasswordTooLong past 72 bytes (#269 review), and Go's len()
// on a string already counts bytes, so no separate byte-counting helper is
// needed. Applying it here caps Login's password too, not just Register's --
// harmless, since Login only ever compares against an already-hashed
// password, and consistent, since both routes share this one rule.
func addPasswordProblem(problems map[string]string, password string) map[string]string {
	switch {
	case password == "":
		problems["password"] = "Password is required"
	case len(password) < 8:
		problems["password"] = "Password must be at least 8 characters"
	case len(password) > 72:
		problems["password"] = "Password must be at most 72 characters"
	case !validations.PasswordComplexity(password):
		problems["password"] = "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character"
	}
	return problems
}

// UserResponse represents the user data returned in API responses
type UserResponse struct {
	ID            int    `json:"id" db:"id"`
	Email         string `json:"email" db:"email"`
	FirstName     string `json:"first_name" db:"first_name"`
	LastName      string `json:"last_name" db:"last_name"`
	Role          string `json:"role" db:"role"`
	HasGoogle     bool   `json:"has_google,omitempty"`
	EmailVerified bool   `json:"email_verified"`
}

// LoginResponse represents the response body for successful login
type LoginResponse struct {
	User          UserResponse `json:"user"`
	AccessToken   string       `json:"access_token"`
	RefreshToken  string       `json:"refresh_token"`
	AccountLinked bool         `json:"account_linked,omitempty"`
}

// RegisterRequest represents the request body for user registration
type RegisterRequest struct {
	Email     string `json:"email"`
	Password  string `json:"password"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Role      string `json:"role"`
	// InviteCode is required for, and only read by, a TEACHER signup:
	// self-service cannot claim that role without one (#250). Whether the
	// code is real is a database question services.Register answers.
	InviteCode string `json:"invite_code"`
	// GradeLevel is an optional age-band signal a student may supply (#244):
	// "6".."12" or "other". A grade, not a birth date -- see
	// docs/legal/student-privacy-posture.md. Optional on purpose: it gates
	// nothing, every pre-#244 account has none, and an API client that never
	// sends it stays valid.
	GradeLevel string `json:"grade_level"`
}

// registerRoles are the roles a self-service signup may claim. ADMIN is
// absent on purpose: an admin is created by another admin. PARENT stays a
// valid DB role and an admin-creatable one, but has no nav and no routes
// (navigation.component.ts returns an empty list for it), so self-service
// signup no longer offers it (#251).
var registerRoles = map[string]bool{
	"STUDENT": true,
	"TEACHER": true,
}

// gradeLevels is the allowed set for RegisterRequest.GradeLevel (#244).
// "other" covers an adult or anyone the 6-12 band does not describe -- an
// answer, not a refusal.
var gradeLevels = map[string]bool{
	"6":     true,
	"7":     true,
	"8":     true,
	"9":     true,
	"10":    true,
	"11":    true,
	"12":    true,
	"other": true,
}

func (req RegisterRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	switch {
	case req.Email == "":
		problems["email"] = "Email is required"
	case !validations.IsEmail(req.Email):
		problems["email"] = "Email must be a valid email address"
	}

	problems = addPasswordProblem(problems, req.Password)

	switch {
	case req.FirstName == "":
		problems["first_name"] = "First name is required"
	case len(req.FirstName) < 2:
		problems["first_name"] = "First name must be at least 2 characters"
	}

	switch {
	case req.LastName == "":
		problems["last_name"] = "Last name is required"
	case len(req.LastName) < 2:
		problems["last_name"] = "Last name must be at least 2 characters"
	}

	switch {
	case req.Role == "":
		problems["role"] = "Role is required"
	case !registerRoles[req.Role]:
		problems["role"] = "Role must be one of: STUDENT, TEACHER"
	}

	// The TEACHER role is the one a stranger must not be able to claim
	// (#250): it grants classes, rosters and other people's scores. This
	// only checks that something was typed -- services.Register asks the
	// database whether the code is real, unexpired and unspent.
	if req.Role == string(Teacher) && strings.TrimSpace(req.InviteCode) == "" {
		problems["invite_code"] = "Invite code is required for teacher accounts"
	}

	// Validated only when present. Making it required would change the exact
	// -string bodies apitests/auth/register.http pins and would break every
	// existing register call. The UI asks; the API does not insist.
	if grade := strings.TrimSpace(req.GradeLevel); grade != "" && !gradeLevels[grade] {
		problems["grade_level"] = "Grade level must be one of: 6, 7, 8, 9, 10, 11, 12, other"
	}

	return problems
}

// RegisterResponse represents the response body for successful registration
type RegisterResponse struct {
	Message string       `json:"message"`
	User    UserResponse `json:"user"`
}

// GoogleCallbackRequest represents the request from the frontend after Google OAuth redirect
type GoogleCallbackRequest struct {
	Code        string `json:"code"`
	RedirectURI string `json:"redirect_uri"`
}

func (req GoogleCallbackRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	// Code has one message for every failure, which is what the tag-based
	// version did: its switch had no per-tag branch.
	if req.Code == "" {
		problems["code"] = "Authorization code is required"
	}

	switch {
	case req.RedirectURI == "":
		problems["redirect_uri"] = "Redirect URI is required"
	case !validations.IsURL(req.RedirectURI):
		problems["redirect_uri"] = "Redirect URI must be a valid URL"
	}

	return problems
}
