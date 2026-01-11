package tests

import (
	"testing"

	dtos "sight-reading/DTOs"
)

// NOTE: Happy path
func TestHappyEntryCheckValidation(t *testing.T) {
	entry := &dtos.Entry{
		TimeLength:       "01:30:30",
		TotalQuestions:   12,
		CorrectQuestions: 11,
		UserID:           4,
	}

	err := entry.ValidateEntry()
	if err != nil {
		t.Fatal(err)
	}
}

// NOTE: Sad path
func TestSadEntryCheckValidation(t *testing.T) {
	entry := &dtos.Entry{
		TimeLength: "29:30:90",
		// Questions:        12,
		// CorrectQuestions: 19,
		// UserID:           4,
	}

	err := entry.ValidateEntry()
	if err == nil {
		t.Fatal("There are no errors dectected, this is a sad path")
	} else {
		t.Logf("Failed as expected: %v", err)
	}
}
