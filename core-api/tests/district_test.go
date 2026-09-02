package tests

import (
	"context"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
)

func validSchool() dtos.School {
	return dtos.School{
		Title:   "Lincoln9",
		City:    "Austin",
		County:  "Travis",
		State:   "Texas",
		Country: "USA",
	}
}

func TestSchoolValid_AcceptsAGoodSchool(t *testing.T) {
	t.Parallel()

	assert.Empty(t, validSchool().Valid(context.Background()))
}

func TestSchoolValid_RejectsMissingFields(t *testing.T) {
	t.Parallel()

	for key, mutate := range map[string]func(*dtos.School){
		"title":   func(s *dtos.School) { s.Title = "" },
		"county":  func(s *dtos.School) { s.County = "" },
		"state":   func(s *dtos.School) { s.State = "" },
		"country": func(s *dtos.School) { s.Country = "" },
	} {
		t.Run(key, func(t *testing.T) {
			t.Parallel()
			school := validSchool()
			mutate(&school)

			assert.NotEmpty(t, school.Valid(context.Background())[key])
		})
	}
}

// City has a tag but never had a switch case, and Title's case tested for
// the tag "alphanum" while the field carried "alphanumunicode". Neither
// failure ever produced a message, so neither field has a working format
// rule. Pinned so a future fix has to say so out loud.
func TestSchoolValid_HasNoFormatRuleForTitleOrCity(t *testing.T) {
	t.Parallel()

	school := validSchool()
	school.Title = "Lincoln High #9"
	school.City = "Austin 3"

	assert.Empty(t, school.Valid(context.Background()))
}
