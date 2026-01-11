package dtos

import (
	"database/sql"
	"errors"
	"strings"

	"sight-reading/validations"

	"github.com/go-playground/validator/v10"
)

type Entry struct {
	ID               *int16         `db:"id"                json:"id"`
	TimeLength       string         `db:"time_length"       json:"time_length"       validate:"required,time"`
	CreatedDate      sql.NullString `db:"created_date"`
	CreatedTime      sql.NullString `db:"created_time"`
	TotalQuestions   int16          `db:"total_questions"   json:"total_questions"   validate:"required,number"`
	CorrectQuestions int16          `db:"correct_questions" json:"correct_questions" validate:"required,number"`
	UserID           int16          `db:"user_id"           json:"user_id"           validate:"required,number"`
	NPM              int8           `db:"notes_per_minute"  json:"notes_per_minute"  validate:"required,number"`
}

// add an or to the hours to ensure the miliary time and nothing else

func (entry *Entry) ValidateEntry() error {
	validate := validator.New()
	err := validate.RegisterValidation("time", validations.EntryTimeLength)
	if err != nil {
		// TODO: json response
		return err
	}

	err = validate.Struct(entry)
	if err != nil {
		var errorMessage []string

		if entry.CorrectQuestions > entry.TotalQuestions {
			errorMessage = append(errorMessage, "CorrectQuestions: Correct questions cannot be more than total questions")
		}

		// NOTE: type asserstion
		if errs, ok := err.(validator.ValidationErrors); ok {
			for _, fieldErr := range errs {
				switch fieldErr.StructField() {

				case "TimeLength":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "TimeLength: Time length is required")
					case "time":
						errorMessage = append(errorMessage, "TimeLength: Time must be in the 23:59:59 format (militaty time)")
					}

				case "Questions":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "Questions: Question amount is required")
					case "number":
						errorMessage = append(errorMessage, "Questions: must be a number")
					}

				case "CorrectQuestions":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "CorrectQuestions: the amount of correct questions are required")
					case "number":
						errorMessage = append(errorMessage, "CorrectQuestions: must be a number")
					}

				case "UserID":
					switch fieldErr.Tag() {
					case "required":
						errorMessage = append(errorMessage, "UserID: ID is required")
					case "number":
						errorMessage = append(errorMessage, "CorrectQuestions: must be a number")
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
