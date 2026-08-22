package dtos

import (
	"database/sql"
	"errors"
	"sight-reading/validations"
	"strings"

	"github.com/go-playground/validator/v10"
)

type User struct {
	ID           *int16         `db:"id" json:"id"`
	FirstName    string         `db:"first_name" json:"first_name" validate:"required,alpha,len255"`
	LastName     string         `db:"last_name" json:"last_name" validate:"required,alpha,len255"`
	Role         Role           `db:"role" json:"role" validate:"required,role"`
	Email        string         `db:"email" json:"email" validate:"required,email,len255"`
	PasswordHash string         `db:"password" json:"-"`
	CreatedDate  sql.NullString `db:"created_date" json:"created_date"`
	CreatedTime  sql.NullString `db:"created_time" json:"created_time"`
	SchoolID     int16          `db:"school_id" json:"school_id" validate:"required,number"`
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

// userFieldMessages maps a struct field and the validator tag it failed
// to the message the API has always returned for that pair. User and
// CreateUserRequest share every field except Password, so they share this
// table; a field a struct does not have simply never appears in its
// errors. The "SchooolID" spelling is intentional -- it is the message
// the API has always sent.
var userFieldMessages = map[string]map[string]string{
	"FirstName": {
		"required": "FirstName: first name is required",
		"alpha":    "FirstName: must be only alphabetical charaters",
		"len255":   "FirstName: must be shorter than 255 characters",
	},
	"LastName": {
		"required": "LastName: last name is required",
		"alpha":    "LastName: must be only alphabetical charaters",
		"len255":   "LastName: must be shorter than 255 characters",
	},
	"Role": {
		"required": "Role: required when making a user",
		"role":     "Role: must be one of STUDENT, TEACHER, PARENT, or ADMIN",
	},
	"Email": {
		"required": "Email: email is required",
		"email":    "Email: must be correctly formatted",
		"len255":   "Email: must be shorter than 255 characters",
	},
	"Password": {
		"required":            "Password: password is required",
		"min":                 "Password: must be at least 8 characters",
		"password_complexity": "Password: must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character",
	},
	"SchoolID": {
		"required": "SchoolID: required when making a user",
		"number":   "SchooolID: must be a number",
	},
}

// newUserValidator builds a validator with the custom rules the user
// shapes rely on.
func newUserValidator() (*validator.Validate, error) {
	validate := validator.New()
	for tag, fn := range map[string]validator.Func{
		"role":                validations.UserRole,
		"len255":              validations.VarChar255Length,
		"password_complexity": validations.PasswordComplexity,
	} {
		if err := validate.RegisterValidation(tag, fn); err != nil {
			return nil, err
		}
	}
	return validate, nil
}

// validateUserShape runs the shared validator over s and renders any
// field failures through userFieldMessages.
func validateUserShape(s any) error {
	validate, err := newUserValidator()
	if err != nil {
		return err
	}

	err = validate.Struct(s)
	if err == nil {
		return nil
	}

	var errorMessage []string
	var errs validator.ValidationErrors
	if errors.As(err, &errs) {
		for _, fieldErr := range errs {
			if msg, ok := userFieldMessages[fieldErr.StructField()][fieldErr.Tag()]; ok {
				errorMessage = append(errorMessage, msg)
			}
		}
	}
	return errors.New(strings.Join(errorMessage, ",\n"))
}

// ValidateUser checks a User's field shape. The fake-data generator is
// its remaining caller; request bodies use CreateUserRequest.
func (user *User) ValidateUser() error {
	return validateUserShape(user)
}

// CreateUserRequest is the request body for POST /user (admin-created
// users). It is distinct from User (which doubles as a read/response
// shape) because it carries a plaintext Password field that the service
// hashes before storage -- User.PasswordHash is `json:"-"` and was never
// actually populated from a request body, which meant admin-created
// users were previously stored with a NULL password.
type CreateUserRequest struct {
	FirstName string `json:"first_name" validate:"required,alpha,len255"`
	LastName  string `json:"last_name" validate:"required,alpha,len255"`
	Role      Role   `json:"role" validate:"required,role"`
	Email     string `json:"email" validate:"required,email,len255"`
	Password  string `json:"password" validate:"required,min=8,password_complexity"`
	SchoolID  int16  `json:"school_id" validate:"required,number"`
}

// Validate applies the same field rules as User.ValidateUser, plus the
// password complexity rule Register uses (see
// validations.PasswordComplexity and RegisterRequest.ValidateRegisterRequest).
func (req *CreateUserRequest) Validate() error {
	return validateUserShape(req)
}
