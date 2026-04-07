package dtos

import (
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/go-playground/validator/v10"
)

var hslPattern = regexp.MustCompile(`^\d{1,3}(?:\.\d+)?\s+[\d.]+%\s+[\d.]+%$`)

type ColorSchemeColors struct {
	Background            string `json:"background"              validate:"required,max=30,hsl"`
	Foreground            string `json:"foreground"              validate:"required,max=30,hsl"`
	Card                  string `json:"card"                    validate:"required,max=30,hsl"`
	CardForeground        string `json:"card_foreground"         validate:"required,max=30,hsl"`
	Popover               string `json:"popover"                 validate:"required,max=30,hsl"`
	PopoverForeground     string `json:"popover_foreground"      validate:"required,max=30,hsl"`
	PrimaryColor          string `json:"primary"                 validate:"required,max=30,hsl"`
	PrimaryForeground     string `json:"primary_foreground"      validate:"required,max=30,hsl"`
	SecondaryColor        string `json:"secondary"               validate:"required,max=30,hsl"`
	SecondaryForeground   string `json:"secondary_foreground"    validate:"required,max=30,hsl"`
	Muted                 string `json:"muted"                   validate:"required,max=30,hsl"`
	MutedForeground       string `json:"muted_foreground"        validate:"required,max=30,hsl"`
	Accent                string `json:"accent"                  validate:"required,max=30,hsl"`
	AccentForeground      string `json:"accent_foreground"       validate:"required,max=30,hsl"`
	Destructive           string `json:"destructive"             validate:"required,max=30,hsl"`
	DestructiveForeground string `json:"destructive_foreground"  validate:"required,max=30,hsl"`
	BorderColor           string `json:"border"                  validate:"required,max=30,hsl"`
	InputColor            string `json:"input"                   validate:"required,max=30,hsl"`
	Ring                  string `json:"ring"                    validate:"required,max=30,hsl"`
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
	SchemeID int `json:"scheme_id" binding:"required,gt=0"`
}

type SetPreferredSchemesRequest struct {
	LightSchemeID int `json:"light_scheme_id" binding:"required,gt=0"`
	DarkSchemeID  int `json:"dark_scheme_id"  binding:"required,gt=0"`
}

func validateColorSchemeRequest(s any) error {
	validate := validator.New()
	if err := validate.RegisterValidation("hsl", func(fl validator.FieldLevel) bool {
		return hslPattern.MatchString(fl.Field().String())
	}); err != nil {
		return err
	}

	err := validate.Struct(s)
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
			case "hsl":
				msg = fmt.Sprintf("%s: must be a valid HSL value (e.g. \"262 83%% 58%%\")", fieldErr.StructField())
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

func (r *CreateColorSchemeRequest) Validate() error {
	return validateColorSchemeRequest(r)
}

func (r *UpdateColorSchemeRequest) Validate() error {
	return validateColorSchemeRequest(r)
}
