package dtos

import (
	"context"
	"database/sql"

	"sight-reading/validations"
)

type School struct {
	ID          *int16         `db:"id"      json:"id"`
	Title       string         `db:"title"   json:"title"`
	City        string         `db:"city"  json:"city"`
	County      string         `db:"county"  json:"county"`
	State       string         `db:"state"   json:"state"`
	Country     string         `db:"country" json:"country"`
	CreatedDate sql.NullString `db:"created_date"`
	CreatedTime sql.NullString `db:"created_time"`
}

// Valid checks a School's field shape.
//
// Title and City have no format rule, which reproduces existing behavior
// rather than adding one. Title's message switch tested for the tag
// "alphanum" while the field carried "alphanumunicode", and City had a
// tag but no case at all, so neither failure ever produced a message --
// and a message-less failure made ValidateSchool return nil.
//
// FIXME: Title should require alphanumeric text and City should require
// alphabetical text. Both are behavior changes, tracked separately.
func (school School) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	switch {
	case school.Title == "":
		problems["title"] = "Title: title is required"
	case !validations.VarChar255Length(school.Title):
		problems["title"] = "Title: must be shorter than 255 characters"
	}

	for _, field := range []struct {
		key      string
		value    string
		required string
		alpha    string
		tooLong  string
	}{
		{"county", school.County, "County amount is required", "County: title must be alpha", "County: must be shorter than 255 characters"},
		{"state", school.State, "State questions are required", "State: title must be alpha", "State: must be shorter than 255 characters"},
		{"country", school.Country, "Country is required", "Country: title must be alpha", "Country: must be shorter than 255 characters"},
	} {
		switch {
		case field.value == "":
			problems[field.key] = field.required
		case !validations.IsAlpha(field.value):
			problems[field.key] = field.alpha
		case !validations.VarChar255Length(field.value):
			problems[field.key] = field.tooLong
		}
	}

	return problems
}
