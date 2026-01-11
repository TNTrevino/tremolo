// Package dtos contains most of the Data Transfer Objects in this application.
// TODO: move validation out of this package into its own package
package dtos

import (
	"errors"
	"sight-reading/validations"
	"strings"

	"github.com/go-playground/validator/v10"
)

// LoginRequest represents the request body for user login
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=8,password_complexity"`
}

// ValidateLoginRequest validates the login request
// TODO: move this to the validations package?
func (req *LoginRequest) ValidateLoginRequest() error {
	validate := validator.New()
	err := validate.RegisterValidation("password_complexity", validations.PasswordComplexity)
	if err != nil {
		return err
	}

	err = validate.Struct(req)
	if err != nil {
		var errorMessage []string
		if errs, ok := err.(validator.ValidationErrors); ok {
			for _, fieldErr := range errs {
				switch fieldErr.StructField() {
				case "Email":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Email is required")
					case "email":
						errorMessage = append(errorMessage, "Email must be a valid email address")
					}
				case "Password":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Password is required")
					case "min":
						errorMessage = append(errorMessage, "Password must be at least 8 characters")
					case "password_complexity":
						errorMessage = append(errorMessage, "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character")
					}
				}
			}
		}
		return errors.New(strings.Join(errorMessage, ", "))
	}
	return nil
}

// UserResponse represents the user data returned in API responses
type UserResponse struct {
	ID        int    `json:"id" db:"id"`
	Email     string `json:"email" db:"email"`
	FirstName string `json:"first_name" db:"first_name"`
	LastName  string `json:"last_name" db:"last_name"`
	Role      string `json:"role" db:"role"`
}

// LoginResponse represents the response body for successful login
type LoginResponse struct {
	User         UserResponse `json:"user"`
	AccessToken  string       `json:"access_token"`
	RefreshToken string       `json:"refresh_token"`
}

// RegisterRequest represents the request body for user registration
type RegisterRequest struct {
	Email     string `json:"email" validate:"required,email"`
	Password  string `json:"password" validate:"required,min=8,password_complexity"`
	FirstName string `json:"first_name" validate:"required,min=2"`
	LastName  string `json:"last_name" validate:"required,min=2"`
	Role      string `json:"role" validate:"required,oneof=student teacher parent"`
}

// ValidateRegisterRequest validates the registration request
func (req *RegisterRequest) ValidateRegisterRequest() error {
	validate := validator.New()
	err := validate.RegisterValidation("password_complexity", validations.PasswordComplexity)
	if err != nil {
		return err
	}

	err = validate.Struct(req)
	if err != nil {
		var errorMessage []string
		if errs, ok := err.(validator.ValidationErrors); ok {
			for _, fieldErr := range errs {
				switch fieldErr.StructField() {
				case "Email":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Email is required")
					case "email":
						errorMessage = append(errorMessage, "Email must be a valid email address")
					}
				case "Password":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Password is required")
					case "min":
						errorMessage = append(errorMessage, "Password must be at least 8 characters")
					case "password_complexity":
						errorMessage = append(errorMessage, "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character")
					}
				case "FirstName":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "First name is required")
					case "min":
						errorMessage = append(errorMessage, "First name must be at least 2 characters")
					}
				case "LastName":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Last name is required")
					case "min":
						errorMessage = append(errorMessage, "Last name must be at least 2 characters")
					}
				case "Role":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Role is required")
					case "oneof":
						errorMessage = append(errorMessage, "Role must be one of: student, teacher, parent")
					}
				}
			}
		}
		return errors.New(strings.Join(errorMessage, ", "))
	}
	return nil
}

// RegisterResponse represents the response body for successful registration
type RegisterResponse struct {
	Message string       `json:"message"`
	User    UserResponse `json:"user"`
}
