package tests

import (
	"context"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
)

func validEntry() dtos.Entry {
	return dtos.Entry{
		TimeLength:       "01:30:30",
		TotalQuestions:   12,
		CorrectQuestions: 11,
		UserID:           4,
		NPM:              5,
	}
}

func TestEntryValid_AcceptsAGoodEntry(t *testing.T) {
	t.Parallel()

	assert.Empty(t, validEntry().Valid(context.Background()))
}

// The time format is the rule most likely to change by accident, so every
// shape the service used to reject is pinned here.
func TestEntryValid_RejectsABadTimeLength(t *testing.T) {
	t.Parallel()

	for name, timeLength := range map[string]string{
		"invalid hours":   "25:30:30",
		"invalid minutes": "12:60:30",
		"invalid seconds": "12:30:60",
		"no colons":       "123030",
		"dashes":          "12-30-30",
		"single digits":   "1:3:3",
		"empty":           "",
		"partial":         "12:30",
	} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			entry := validEntry()
			entry.TimeLength = timeLength

			problems := entry.Valid(context.Background())

			assert.Contains(t, problems["time_length"], "TimeLength")
		})
	}
}

func TestEntryValid_RejectsMoreCorrectThanTotal(t *testing.T) {
	t.Parallel()

	entry := validEntry()
	entry.TotalQuestions = 10
	entry.CorrectQuestions = 15

	problems := entry.Valid(context.Background())

	assert.Contains(t, problems["correct_questions"], "CorrectQuestions")
}

func TestEntryValid_RejectsMissingFields(t *testing.T) {
	t.Parallel()

	for key, mutate := range map[string]func(*dtos.Entry){
		"time_length":       func(e *dtos.Entry) { e.TimeLength = "" },
		"correct_questions": func(e *dtos.Entry) { e.CorrectQuestions = 0 },
		"user_id":           func(e *dtos.Entry) { e.UserID = 0 },
		"notes_per_minute":  func(e *dtos.Entry) { e.NPM = 0 },
	} {
		t.Run(key, func(t *testing.T) {
			t.Parallel()
			entry := validEntry()
			mutate(&entry)

			problems := entry.Valid(context.Background())

			assert.NotEmpty(t, problems[key])
		})
	}
}

// TotalQuestions has no presence rule. The switch case that was meant to
// report it is spelled "Questions", so it never matched the field and a
// zero total has never been reported. Pinned here so the day someone
// adds the rule, this test fails and says so.
//
// A zero total forces a zero correct, and that field does have a rule, so
// this asserts on the absence of the total_questions key rather than on
// an empty map.
func TestEntryValid_HasNoRuleForTotalQuestions(t *testing.T) {
	t.Parallel()

	entry := validEntry()
	entry.TotalQuestions = 0
	entry.CorrectQuestions = 0

	problems := entry.Valid(context.Background())

	assert.NotContains(t, problems, "total_questions")
}
