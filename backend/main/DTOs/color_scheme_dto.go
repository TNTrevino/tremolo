package dtos

import (
	"errors"
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

type ColorSchemeColors struct {
	Background            string `json:"background"              validate:"required,max=30"`
	Foreground            string `json:"foreground"              validate:"required,max=30"`
	Card                  string `json:"card"                    validate:"required,max=30"`
	CardForeground        string `json:"card_foreground"         validate:"required,max=30"`
	Popover               string `json:"popover"                 validate:"required,max=30"`
	PopoverForeground     string `json:"popover_foreground"      validate:"required,max=30"`
	PrimaryColor          string `json:"primary"                 validate:"required,max=30"`
	PrimaryForeground     string `json:"primary_foreground"      validate:"required,max=30"`
	SecondaryColor        string `json:"secondary"               validate:"required,max=30"`
	SecondaryForeground   string `json:"secondary_foreground"    validate:"required,max=30"`
	Muted                 string `json:"muted"                   validate:"required,max=30"`
	MutedForeground       string `json:"muted_foreground"        validate:"required,max=30"`
	Accent                string `json:"accent"                  validate:"required,max=30"`
	AccentForeground      string `json:"accent_foreground"       validate:"required,max=30"`
	Destructive           string `json:"destructive"             validate:"required,max=30"`
	DestructiveForeground string `json:"destructive_foreground"  validate:"required,max=30"`
	BorderColor           string `json:"border"                  validate:"required,max=30"`
	InputColor            string `json:"input"                   validate:"required,max=30"`
	Ring                  string `json:"ring"                    validate:"required,max=30"`
}

type CreateColorSchemeRequest struct {
	Name   string            `json:"name"    validate:"required,max=100"`
	IsDark bool              `json:"is_dark"`
	Colors ColorSchemeColors `json:"colors"  validate:"required"`
}

type UpdateColorSchemeRequest struct {
	Name   string            `json:"name"    validate:"required,max=100"`
	IsDark bool              `json:"is_dark"`
	Colors ColorSchemeColors `json:"colors"  validate:"required"`
}

type ColorSchemeResponse struct {
	ID       int               `json:"id"`
	UserID   int               `json:"user_id"`
	Name     string            `json:"name"`
	IsPreset bool              `json:"is_preset"`
	IsDark   bool              `json:"is_dark"`
	Colors   ColorSchemeColors `json:"colors"`
}

type SetActiveSchemeRequest struct {
	SchemeID int `json:"scheme_id" validate:"required"`
}

type SetPreferredSchemesRequest struct {
	LightSchemeID int `json:"light_scheme_id" validate:"required"`
	DarkSchemeID  int `json:"dark_scheme_id"  validate:"required"`
}

func (r *CreateColorSchemeRequest) Validate() error {
	validate := validator.New()
	err := validate.Struct(r)
	if err != nil {
		errs, ok := err.(validator.ValidationErrors)
		if !ok {
			return err
		}
		var errorMessages []string
		for _, fieldErr := range errs {
			var msg string
			switch fieldErr.Tag() {
			case "required":
				msg = fmt.Sprintf("%s: is required", fieldErr.StructField())
			case "max":
				msg = fmt.Sprintf("%s: must be at most %s characters", fieldErr.StructField(), fieldErr.Param())
			default:
				msg = fmt.Sprintf("%s: failed validation '%s'", fieldErr.StructField(), fieldErr.Tag())
			}
			errorMessages = append(errorMessages, msg)
		}
		if len(errorMessages) > 0 {
			return errors.New(strings.Join(errorMessages, ",\n"))
		}
		return err
	}
	return nil
}

func (r *UpdateColorSchemeRequest) Validate() error {
	validate := validator.New()
	err := validate.Struct(r)
	if err != nil {
		errs, ok := err.(validator.ValidationErrors)
		if !ok {
			return err
		}
		var errorMessages []string
		for _, fieldErr := range errs {
			var msg string
			switch fieldErr.Tag() {
			case "required":
				msg = fmt.Sprintf("%s: is required", fieldErr.StructField())
			case "max":
				msg = fmt.Sprintf("%s: must be at most %s characters", fieldErr.StructField(), fieldErr.Param())
			default:
				msg = fmt.Sprintf("%s: failed validation '%s'", fieldErr.StructField(), fieldErr.Tag())
			}
			errorMessages = append(errorMessages, msg)
		}
		if len(errorMessages) > 0 {
			return errors.New(strings.Join(errorMessages, ",\n"))
		}
		return err
	}
	return nil
}
