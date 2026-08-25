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
		"time_length": func(e *dtos.Entry) { e.TimeLength = "" },
		"user_id":     func(e *dtos.Entry) { e.UserID = 0 },
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

// A 0/10 game is a legitimate result (a beginner who missed everything),
// not a missing field. Pinned so the presence-check regression this issue
// fixed does not come back.
func TestEntryValid_AcceptsZeroCorrectQuestions(t *testing.T) {
	t.Parallel()

	entry := validEntry()
	entry.CorrectQuestions = 0

	assert.Empty(t, entry.Valid(context.Background()))
}

// TotalQuestions must be positive: a zero (or negative) total describes no
// game at all.
func TestEntryValid_RejectsZeroTotalQuestions(t *testing.T) {
	t.Parallel()

	entry := validEntry()
	entry.TotalQuestions = 0
	entry.CorrectQuestions = 0

	problems := entry.Valid(context.Background())

	assert.Contains(t, problems["total_questions"], "TotalQuestions")
}

// The frontend computes npm = total/timeElapsed and rounds it, so a slow
// game can legitimately round down to 0 -- that is not a missing value and
// must still save.
func TestEntryValid_AcceptsZeroNPM(t *testing.T) {
	t.Parallel()

	entry := validEntry()
	entry.NPM = 0

	assert.Empty(t, entry.Valid(context.Background()))
}

func TestEntryValid_RejectsNegativeNPM(t *testing.T) {
	t.Parallel()

	entry := validEntry()
	entry.NPM = -1

	problems := entry.Valid(context.Background())

	assert.Contains(t, problems["notes_per_minute"], "NPM")
}
