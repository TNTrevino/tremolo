package dtos

import (
	"database/sql"
	"errors"
	"strings"

	"sight-reading/validations"

	"github.com/go-playground/validator/v10"
)

type School struct {
	ID          *int16         `db:"id"      json:"id"`
	Title       string         `db:"title"   json:"title"    validate:"required,alphanumunicode,len255"`
	City        string         `db:"city"  json:"city"   validate:"required,alpha,len255"`
	County      string         `db:"county"  json:"county"   validate:"required,alpha,len255"`
	State       string         `db:"state"   json:"state"    validate:"required,alpha,len255"`
	Country     string         `db:"country" json:"country"  validate:"required,alpha,len255"`
	CreatedDate sql.NullString `db:"created_date"`
	CreatedTime sql.NullString `db:"created_time"`
}

// TODO: add varchar constraints
func (school *School) ValidateSchool() error {
	validate := validator.New()
	err := validate.RegisterValidation("len255", validations.VarChar255Length)
	if err != nil {
		// TODO: json response
		return err
	}

	err = validate.Struct(school)
	if err != nil {
		var errorMessage []string
		if errs, ok := err.(validator.ValidationErrors); ok {
			for _, fieldErr := range errs {
				switch fieldErr.StructField() {

				case "Title":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Title: title is required")
					case "alphanum":
						errorMessage = append(errorMessage, "Title: title must be alphanumeric")
					case "len255":
						errorMessage = append(errorMessage, "Title: must be shorter than 255 characters")
					}

				case "County":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "County amount is required")
					case "alpha":
						errorMessage = append(errorMessage, "County: title must be alpha")
					case "len255":
						errorMessage = append(errorMessage, "County: must be shorter than 255 characters")
					}

				case "State":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "State questions are required")
					case "alpha":
						errorMessage = append(errorMessage, "State: title must be alpha")
					case "len255":
						errorMessage = append(errorMessage, "State: must be shorter than 255 characters")
					}

				case "Country":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Country is required")
					case "alpha":
						errorMessage = append(errorMessage, "Country: title must be alpha")
					case "len255":
						errorMessage = append(errorMessage, "Country: must be shorter than 255 characters")
					}
				}
			}
		}
		if len(errorMessage) > 0 {
			return errors.New(strings.Join(errorMessage, ",\n"))
		}
	}
	return nil
}
