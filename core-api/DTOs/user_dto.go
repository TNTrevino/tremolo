package dtos

import (
	"context"
	"database/sql"

	"sight-reading/validations"
)

type User struct {
	ID           *int16         `db:"id" json:"id"`
	FirstName    string         `db:"first_name" json:"first_name"`
	LastName     string         `db:"last_name" json:"last_name"`
	Role         Role           `db:"role" json:"role"`
	Email        string         `db:"email" json:"email"`
	PasswordHash string         `db:"password" json:"-"`
	CreatedDate  sql.NullString `db:"created_date" json:"created_date"`
	CreatedTime  sql.NullString `db:"created_time" json:"created_time"`
	SchoolID     int16          `db:"school_id" json:"school_id"`
}

type Role string

const (
	Admin   Role = "ADMIN"
	Teacher Role = "TEACHER"
	Parent  Role = "PARENT"
	Student Role = "STUDENT"
)

var ValidRoles = map[Role]bool{
	Admin:   true,
	Teacher: true,
	Parent:  true,
	Student: true,
}

// userShapeProblems holds the field rules User and CreateUserRequest
// share. The two shapes differ only by Password, so the common rules live
// here rather than in two copies that can drift.
//
// The "SchooolID" spelling below is intentional -- it is the message this
// API has always sent.
func userShapeProblems(firstName, lastName string, role Role, email string, schoolID int16) map[string]string {
	problems := map[string]string{}

	switch {
	case firstName == "":
		problems["first_name"] = "FirstName: first name is required"
	case !validations.IsAlpha(firstName):
		problems["first_name"] = "FirstName: must be only alphabetical charaters"
	case !validations.VarChar255Length(firstName):
		problems["first_name"] = "FirstName: must be shorter than 255 characters"
	}

	switch {
	case lastName == "":
		problems["last_name"] = "LastName: last name is required"
	case !validations.IsAlpha(lastName):
		problems["last_name"] = "LastName: must be only alphabetical charaters"
	case !validations.VarChar255Length(lastName):
		problems["last_name"] = "LastName: must be shorter than 255 characters"
	}

	switch {
	case role == "":
		problems["role"] = "Role: required when making a user"
	case !validations.UserRole(string(role)):
		problems["role"] = "Role: must be one of STUDENT, TEACHER, PARENT, or ADMIN"
	}

	switch {
	case email == "":
		problems["email"] = "Email: email is required"
	case !validations.IsEmail(email):
		problems["email"] = "Email: must be correctly formatted"
	case !validations.VarChar255Length(email):
		problems["email"] = "Email: must be shorter than 255 characters"
	}

	if schoolID == 0 {
		problems["school_id"] = "SchoolID: required when making a user"
	}

	return problems
}

// Valid checks a User's field shape. The fake-data generator is its
// remaining caller; request bodies use CreateUserRequest.
func (user User) Valid(ctx context.Context) map[string]string {
	return userShapeProblems(user.FirstName, user.LastName, user.Role, user.Email, user.SchoolID)
}

// CreateUserRequest is the request body for POST /user (admin-created
// users). It is distinct from User (which doubles as a read/response
// shape) because it carries a plaintext Password field that the service
// hashes before storage -- User.PasswordHash is `json:"-"` and was never
// actually populated from a request body, which meant admin-created
// users were previously stored with a NULL password.
type CreateUserRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Role      Role   `json:"role"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	SchoolID  int16  `json:"school_id"`
}

// Valid applies the same field rules as User.Valid, plus the password
// rules a created user needs.
func (req CreateUserRequest) Valid(ctx context.Context) map[string]string {
	problems := userShapeProblems(req.FirstName, req.LastName, req.Role, req.Email, req.SchoolID)

	switch {
	case req.Password == "":
		problems["password"] = "Password: password is required"
	case len(req.Password) < 8:
		problems["password"] = "Password: must be at least 8 characters"
	case !validations.PasswordComplexity(req.Password):
		problems["password"] = "Password: must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character"
	}

	return problems
}
