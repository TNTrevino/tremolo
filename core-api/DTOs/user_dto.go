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

func (user *User) ValidateUser() error {
	validate := validator.New()
	err := validate.RegisterValidation("role", validations.UserRole)
	if err != nil {
		// TODO: json response
		return err
	}
	err = validate.RegisterValidation("len255", validations.VarChar255Length)
	if err != nil {
		// TODO: json response
		return err
	}

	err = validate.Struct(user)
	if err != nil {
		var errorMessage []string
		if errs, ok := err.(validator.ValidationErrors); ok {
			for _, fieldErr := range errs {
				switch fieldErr.StructField() {

				case "FirstName":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "FirstName: first name is required")
					case "alpha":
						errorMessage = append(errorMessage, "FirstName: must be only alphabetical charaters")
					case "len255":
						errorMessage = append(errorMessage, "FirstName: must be shorter than 255 characters")
					}

				case "LastName":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "LastName: last name is required")
					case "alpha":
						errorMessage = append(errorMessage, "LastName: must be only alphabetical charaters")
					case "len255":
						errorMessage = append(errorMessage, "LastName: must be shorter than 255 characters")
					}

				case "Role":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Role: required when making a user")
					case "role":
						errorMessage = append(errorMessage, "Role: must be one of STUDENT, TEACHER, PARENT, or ADMIN")
					}

				case "Email":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Email: email is required")
					case "email":
						errorMessage = append(errorMessage, "Email: must be correctly formatted")
					case "len255":
						errorMessage = append(errorMessage, "Email: must be shorter than 255 characters")
					}

				case "SchoolID":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "SchoolID: required when making a user")
					case "number":
						errorMessage = append(errorMessage, "SchooolID: must be a number")
					}
				}
			}
		}
		return errors.New(strings.Join(errorMessage, ",\n"))
	}
	return nil
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
	validate := validator.New()
	if err := validate.RegisterValidation("role", validations.UserRole); err != nil {
		return err
	}
	if err := validate.RegisterValidation("len255", validations.VarChar255Length); err != nil {
		return err
	}
	if err := validate.RegisterValidation("password_complexity", validations.PasswordComplexity); err != nil {
		return err
	}

	err := validate.Struct(req)
	if err != nil {
		var errorMessage []string
		if errs, ok := err.(validator.ValidationErrors); ok {
			for _, fieldErr := range errs {
				switch fieldErr.StructField() {

				case "FirstName":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "FirstName: first name is required")
					case "alpha":
						errorMessage = append(errorMessage, "FirstName: must be only alphabetical charaters")
					case "len255":
						errorMessage = append(errorMessage, "FirstName: must be shorter than 255 characters")
					}

				case "LastName":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "LastName: last name is required")
					case "alpha":
						errorMessage = append(errorMessage, "LastName: must be only alphabetical charaters")
					case "len255":
						errorMessage = append(errorMessage, "LastName: must be shorter than 255 characters")
					}

				case "Role":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Role: required when making a user")
					case "role":
						errorMessage = append(errorMessage, "Role: must be one of STUDENT, TEACHER, PARENT, or ADMIN")
					}

				case "Email":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Email: email is required")
					case "email":
						errorMessage = append(errorMessage, "Email: must be correctly formatted")
					case "len255":
						errorMessage = append(errorMessage, "Email: must be shorter than 255 characters")
					}

				case "Password":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Password: password is required")
					case "min":
						errorMessage = append(errorMessage, "Password: must be at least 8 characters")
					case "password_complexity":
						errorMessage = append(errorMessage, "Password: must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character")
					}

				case "SchoolID":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "SchoolID: required when making a user")
					case "number":
						errorMessage = append(errorMessage, "SchooolID: must be a number")
					}
				}
			}
		}
		return errors.New(strings.Join(errorMessage, ",\n"))
	}
	return nil
}
