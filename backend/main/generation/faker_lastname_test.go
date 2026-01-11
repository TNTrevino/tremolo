package generation

import (
	"testing"

	"github.com/manveru/faker"
)

// Test to reproduce the empty LastName issue
func TestFakerLastNameIssue(t *testing.T) {
	// Initialize faker
	fake, err := faker.New("en")
	if err != nil {
		t.Fatalf("Failed to initialize faker: %v", err)
	}

	// Generate 1000 last names and check for empty ones
	emptyCount := 0
	var emptyIndices []int

	for i := 0; i < 1000; i++ {
		lastName := fake.LastName()
		if lastName == "" {
			emptyCount++
			emptyIndices = append(emptyIndices, i)
		}
	}

	if emptyCount > 0 {
		t.Logf("Found %d empty last names out of 1000 (%.2f%%)", emptyCount, float64(emptyCount)/10.0)
		t.Logf("Empty occurrences at indices: %v (showing first 10)", emptyIndices[:min(10, len(emptyIndices))])
		t.Logf("This confirms the bug - fake.LastName() sometimes returns empty strings")
	} else {
		t.Logf("No empty last names found in 1000 attempts - bug may not be reproducible")
	}

	// Test FirstName as well
	emptyFirstNameCount := 0
	for i := 0; i < 1000; i++ {
		firstName := fake.FirstName()
		if firstName == "" {
			emptyFirstNameCount++
		}
	}

	if emptyFirstNameCount > 0 {
		t.Logf("Also found %d empty first names out of 1000", emptyFirstNameCount)
	} else {
		t.Logf("No empty first names found")
	}
}

// Test the current workaround (appending "x")
func TestWorkaroundForEmptyLastName(t *testing.T) {
	fake, err := faker.New("en")
	if err != nil {
		t.Fatalf("Failed to initialize faker: %v", err)
	}

	// Test current workaround
	for i := 0; i < 100; i++ {
		lastName := fake.LastName() + "x"
		if len(lastName) <= 1 { // Only "x"
			t.Errorf("Workaround failed at iteration %d: lastName is '%s'", i, lastName)
		}
	}

	t.Logf("Workaround (appending 'x') works for all 100 attempts")
}

// Test alternative solution: retry until non-empty
func TestAlternativeSolutionRetry(t *testing.T) {
	fake, err := faker.New("en")
	if err != nil {
		t.Fatalf("Failed to initialize faker: %v", err)
	}

	// Alternative: retry until we get a non-empty last name
	generateNonEmptyLastName := func() string {
		maxRetries := 10
		for i := 0; i < maxRetries; i++ {
			lastName := fake.LastName()
			if lastName != "" {
				return lastName
			}
		}
		// Fallback: use a default last name
		return "Smith"
	}

	// Test this approach
	for i := 0; i < 100; i++ {
		lastName := generateNonEmptyLastName()
		if lastName == "" {
			t.Errorf("Retry solution failed at iteration %d", i)
		}
	}

	t.Logf("Retry solution works for all 100 attempts")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
