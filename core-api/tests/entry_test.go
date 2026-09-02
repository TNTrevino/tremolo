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

// The time_length-missing case lives in TestEntryValid_RejectsABadTimeLength
// (its "empty" case), so it isn't repeated here.
func TestEntryValid_RejectsMissingUserID(t *testing.T) {
	t.Parallel()

	entry := validEntry()
	entry.UserID = 0

	problems := entry.Valid(context.Background())

	assert.Contains(t, problems["user_id"], "UserID")
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

// Issue #252: widening NPM from int8 to float64 removed the implicit upper
// bound JSON decoding used to enforce, so an unbounded value like this
// passed Valid() and reached int32(math.Round(entry.NPM)) in
// services.CreateNoteGameEntry -- an out-of-range float-to-int32
// conversion, which Go leaves implementation-defined. The exact message is
// pinned (not just Contains, like the other rules above) because the cap
// number itself is the point of the fix.
func TestEntryValid_RejectsNPMAboveCap(t *testing.T) {
	t.Parallel()

	entry := validEntry()
	entry.NPM = 1e15

	problems := entry.Valid(context.Background())

	assert.Equal(t, "NPM: notes per minute cannot exceed 1000", problems["notes_per_minute"])
}

// 1000 itself must still save: world-class instrumentalists top out far
// below it, so the cap must reject only values beyond it, not the
// boundary value.
func TestEntryValid_AcceptsNPMAtCap(t *testing.T) {
	t.Parallel()

	entry := validEntry()
	entry.NPM = 1000

	assert.Empty(t, entry.Valid(context.Background()))
}

// Validation runs on the raw submitted value, before the service's
// math.Round -- so 1000.4 is rejected even though it would round to
// exactly 1000. Pinning that ordering here so it doesn't drift.
func TestEntryValid_RejectsNPMJustOverCap(t *testing.T) {
	t.Parallel()

	entry := validEntry()
	entry.NPM = 1000.4

	problems := entry.Valid(context.Background())

	assert.Equal(t, "NPM: notes per minute cannot exceed 1000", problems["notes_per_minute"])
}
