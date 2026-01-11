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
						errorMessage = append(errorMessage, "Role: must be either STUDENT, TEACHER, or ADMIN")
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
