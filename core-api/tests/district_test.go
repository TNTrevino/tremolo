package tests

import (
	"strings"
	"testing"

	dtos "sight-reading/DTOs"
)

// NOTE: Happy path
func TestHappySchoolCheckValidation(t *testing.T) {
	School := &dtos.School{
		Title:   "Byron Nelson High School",
		County:  "Denton",
		State:   "Texas",
		Country: "USA",
	}

	err := School.ValidateSchool()
	if err != nil {
		t.Fatal(err)
	}
}

// NOTE: Sad path
func TestSadSchoolCheckValidation(t *testing.T) {
	School := &dtos.School{
		Title: strings.Repeat("Foo", 100),
		// County:  "Denton",
		State:   "Texas",
		Country: "USA",
	}

	err := School.ValidateSchool()
	if err == nil {
		t.Fatal("There are no errors dectected, this is a sad path")
	} else {
		t.Logf("Failed as expected: %v", err)
	}
}
