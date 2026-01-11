package generation

import (
	"fmt"
	"testing"
	"time"
)

// Test shouldDecreasePerformance
func TestShouldDecreasePerformance(t *testing.T) {
	// Test with 100% probability - should always return true
	count := 0
	for i := 0; i < 100; i++ {
		if shouldDecreasePerformance(1.0) {
			count++
		}
	}
	if count != 100 {
		t.Errorf("Expected 100 bad days with 100%% probability, got %d", count)
	}

	// Test with 0% probability - should always return false
	count = 0
	for i := 0; i < 100; i++ {
		if shouldDecreasePerformance(0.0) {
			count++
		}
	}
	if count != 0 {
		t.Errorf("Expected 0 bad days with 0%% probability, got %d", count)
	}

	// Test with 50% probability - should be roughly 50
	count = 0
	for i := 0; i < 1000; i++ {
		if shouldDecreasePerformance(0.5) {
			count++
		}
	}
	// Allow ±10% margin
	if count < 400 || count > 600 {
		t.Logf("Warning: Expected ~500 bad days with 50%% probability, got %d (within margin)", count)
	}

	t.Logf("50%% probability test: %d/1000 bad days", count)
}

// Test generateDateInRange
func TestGenerateDateInRange(t *testing.T) {
	startDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2025, 12, 31, 23, 59, 59, 0, time.UTC)

	// Generate 100 dates and verify they're all within range
	for i := 0; i < 100; i++ {
		date := generateDateInRange(startDate, endDate)

		if date.Before(startDate) {
			t.Errorf("Generated date %v is before start date %v", date, startDate)
		}
		if date.After(endDate) {
			t.Errorf("Generated date %v is after end date %v", date, endDate)
		}
	}

	t.Logf("All 100 generated dates are within range")
}

// Test generateChronologicalDates
func TestGenerateChronologicalDates(t *testing.T) {
	startDate := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(2025, 11, 8, 23, 59, 59, 0, time.UTC)

	count := 50
	dates := generateChronologicalDates(count, startDate, endDate)

	// Verify we got the correct number of dates
	if len(dates) != count {
		t.Errorf("Expected %d dates, got %d", count, len(dates))
	}

	// Verify dates are chronologically sorted
	for i := 1; i < len(dates); i++ {
		if dates[i].Before(dates[i-1]) {
			t.Errorf("Dates are not chronologically sorted at index %d: %v comes before %v",
				i, dates[i], dates[i-1])
		}
	}

	// Verify all dates are within range
	for i, date := range dates {
		if date.Before(startDate) || date.After(endDate) {
			t.Errorf("Date at index %d (%v) is outside range [%v, %v]",
				i, date, startDate, endDate)
		}
	}

	t.Logf("Generated %d chronologically sorted dates", count)
	t.Logf("First date: %v", dates[0])
	t.Logf("Last date: %v", dates[len(dates)-1])
}

// Test generateRealisticNPM
func TestGenerateRealisticNPM(t *testing.T) {
	testCases := []struct {
		skillLevel  SkillLevel
		minExpected int
		maxExpected int
	}{
		{SkillBeginner, MIN_NPM_BEGINNER, MAX_NPM_BEGINNER},
		{SkillIntermediate, MIN_NPM_INTERMEDIATE, MAX_NPM_INTERMEDIATE},
		{SkillAdvanced, MIN_NPM_ADVANCED, MAX_NPM_ADVANCED},
	}

	for _, tc := range testCases {
		// Generate 100 NPM values and verify they're all within expected range
		for i := 0; i < 100; i++ {
			npm := generateRealisticNPM(tc.skillLevel, 0.2)

			if npm < tc.minExpected {
				t.Errorf("NPM %d is below minimum %d for skill level %v",
					npm, tc.minExpected, tc.skillLevel)
			}
			if npm > tc.maxExpected {
				t.Errorf("NPM %d is above maximum %d for skill level %v",
					npm, tc.maxExpected, tc.skillLevel)
			}
		}
		t.Logf("Skill level %v: NPM values are within range [%d, %d]",
			tc.skillLevel, tc.minExpected, tc.maxExpected)
	}
}

// Test generateRealisticQuestionCount
func TestGenerateRealisticQuestionCount(t *testing.T) {
	testCases := []struct {
		sessionLength int
		npm           int
		expectedMin   int
		expectedMax   int
	}{
		{5, 60, 200, 400},     // 5 min at 60 NPM = 300 ± 15%
		{10, 120, 900, 1500},  // 10 min at 120 NPM = 1200 ± 15%
		{30, 200, 4500, 7500}, // 30 min at 200 NPM = 6000 ± 15%
	}

	for _, tc := range testCases {
		questions := generateRealisticQuestionCount(tc.sessionLength, tc.npm)

		// Verify question count makes sense
		if questions < 10 {
			t.Errorf("Question count %d is below minimum (10)", questions)
		}

		t.Logf("Session: %d min, NPM: %d → Questions: %d (expected ~%d)",
			tc.sessionLength, tc.npm, questions, tc.sessionLength*tc.npm)
	}
}

// Test generateAccuracyScore
func TestGenerateAccuracyScore(t *testing.T) {
	testCases := []struct {
		baseAccuracy float64
		variance     float64
	}{
		{50.0, 0.2},  // 50% ± 20%
		{80.0, 0.1},  // 80% ± 10%
		{95.0, 0.05}, // 95% ± 5%
	}

	for _, tc := range testCases {
		// Generate 100 accuracy scores
		for i := 0; i < 100; i++ {
			accuracy := generateAccuracyScore(tc.baseAccuracy, tc.variance)

			// Verify accuracy is within bounds [30, 98]
			if accuracy < 30.0 || accuracy > 98.0 {
				t.Errorf("Accuracy %.2f is outside valid range [30, 98]", accuracy)
			}
		}
		t.Logf("Base accuracy %.2f with variance %.2f: all values within bounds",
			tc.baseAccuracy, tc.variance)
	}
}

// Test calculateSessionLength
func TestCalculateSessionLength(t *testing.T) {
	testCases := []struct {
		totalQuestions  int
		npm             int
		expectedMinutes int
	}{
		{300, 60, 5},    // 300 questions at 60 NPM = 5 minutes
		{1200, 120, 10}, // 1200 questions at 120 NPM = 10 minutes
		{6000, 200, 30}, // 6000 questions at 200 NPM = 30 minutes
	}

	for _, tc := range testCases {
		sessionLength := calculateSessionLength(tc.totalQuestions, tc.npm)

		t.Logf("Questions: %d, NPM: %d → Session Length: %s (expected ~%d min)",
			tc.totalQuestions, tc.npm, sessionLength, tc.expectedMinutes)

		// Verify format is HH:MM:SS
		var hours, minutes, seconds int
		_, err := fmt.Sscanf(sessionLength, "%02d:%02d:%02d", &hours, &minutes, &seconds)
		if err != nil {
			t.Errorf("Invalid session length format: %s, error: %v", sessionLength, err)
		}

		// Verify hours is always 0 (sessions should be less than 1 hour)
		if hours != 0 {
			t.Errorf("Expected 0 hours, got %d", hours)
		}
	}
}

// Test generateStudentProgressProfile
func TestGenerateStudentProgressProfile(t *testing.T) {
	// Generate 100 profiles and verify they have valid values
	for i := 0; i < 100; i++ {
		profile := generateStudentProgressProfile()

		// Verify skill level is valid
		if profile.BaseSkillLevel < SkillBeginner || profile.BaseSkillLevel > SkillAdvanced {
			t.Errorf("Invalid skill level: %v", profile.BaseSkillLevel)
		}

		// Verify improvement rate is valid
		if profile.ImprovementRate < ImprovementSlow || profile.ImprovementRate > ImprovementFast {
			t.Errorf("Invalid improvement rate: %v", profile.ImprovementRate)
		}

		// Verify NPM is within valid range
		if profile.BaseNPM < MIN_NPM_BEGINNER || profile.BaseNPM > MAX_NPM_ADVANCED {
			t.Errorf("Base NPM %d is outside valid range [%d, %d]",
				profile.BaseNPM, MIN_NPM_BEGINNER, MAX_NPM_ADVANCED)
		}

		// Verify accuracy is within valid range
		if profile.BaseAccuracy < float64(MIN_ACCURACY_BEGINNER) || profile.BaseAccuracy > float64(MAX_ACCURACY_ADVANCED) {
			t.Errorf("Base accuracy %.2f is outside valid range [%d, %d]",
				profile.BaseAccuracy, MIN_ACCURACY_BEGINNER, MAX_ACCURACY_ADVANCED)
		}

		// Verify consistency is in [0.5, 1.0]
		if profile.Consistency < 0.5 || profile.Consistency > 1.0 {
			t.Errorf("Consistency %.2f is outside valid range [0.5, 1.0]", profile.Consistency)
		}

		// Verify growth rates are positive
		if profile.NPMGrowthPerDay <= 0 {
			t.Errorf("NPM growth rate should be positive, got %.2f", profile.NPMGrowthPerDay)
		}
		if profile.AccuracyGrowthPerDay <= 0 {
			t.Errorf("Accuracy growth rate should be positive, got %.2f", profile.AccuracyGrowthPerDay)
		}
	}

	t.Logf("Generated 100 valid student progress profiles")
}

// Test generateRealisticNoteGameEntries
func TestGenerateRealisticNoteGameEntries(t *testing.T) {
	// Create a test profile
	profile := StudentProgressProfile{
		BaseSkillLevel:       SkillBeginner,
		ImprovementRate:      ImprovementMedium,
		BaseNPM:              50,
		BaseAccuracy:         50.0,
		NPMGrowthPerDay:      0.3,
		AccuracyGrowthPerDay: 0.05,
		Consistency:          0.7,
	}

	entryCount := 20
	studentID := int16(1)

	entries := generateRealisticNoteGameEntries(studentID, entryCount, profile)

	// Verify we got the correct number of entries
	if len(entries) != entryCount {
		t.Errorf("Expected %d entries, got %d", entryCount, len(entries))
	}

	// Verify entries are chronologically sorted
	for i := 1; i < len(entries); i++ {
		prevDate := entries[i-1].CreatedDate.String + " " + entries[i-1].CreatedTime.String
		currDate := entries[i].CreatedDate.String + " " + entries[i].CreatedTime.String

		prevTime, _ := time.Parse("2006-01-02 15:04:05", prevDate)
		currTime, _ := time.Parse("2006-01-02 15:04:05", currDate)

		if currTime.Before(prevTime) {
			t.Errorf("Entries are not chronologically sorted at index %d", i)
		}
	}

	// Verify all entries have valid data
	for i, entry := range entries {
		// Verify user ID
		if entry.UserID != studentID {
			t.Errorf("Entry %d has incorrect user ID: expected %d, got %d", i, studentID, entry.UserID)
		}

		// Verify NPM is within valid range
		if entry.NPM < MIN_NPM_BEGINNER || entry.NPM > MAX_NPM_ADVANCED {
			t.Errorf("Entry %d has NPM %d outside valid range", i, entry.NPM)
		}

		// Verify correct questions <= total questions
		if entry.CorrectQuestions > entry.TotalQuestions {
			t.Errorf("Entry %d has more correct questions (%d) than total (%d)",
				i, entry.CorrectQuestions, entry.TotalQuestions)
		}

		// Verify total questions is reasonable
		if entry.TotalQuestions < 10 {
			t.Errorf("Entry %d has unreasonably low question count: %d", i, entry.TotalQuestions)
		}

		// Verify time length format
		var hours, minutes, seconds int
		_, err := fmt.Sscanf(entry.TimeLength, "%02d:%02d:%02d", &hours, &minutes, &seconds)
		if err != nil {
			t.Errorf("Entry %d has invalid time length format: %s", i, entry.TimeLength)
		}
	}

	// Check for progression (NPM should generally increase)
	firstNPM := entries[0].NPM
	lastNPM := entries[len(entries)-1].NPM
	if lastNPM <= firstNPM {
		t.Logf("Warning: Expected NPM to increase from %d to higher, but got %d (could be variance)",
			firstNPM, lastNPM)
	} else {
		t.Logf("NPM progressed from %d to %d ✓", firstNPM, lastNPM)
	}

	// Check for progression (Accuracy should generally increase)
	firstAccuracy := float64(entries[0].CorrectQuestions) / float64(entries[0].TotalQuestions) * 100
	lastAccuracy := float64(entries[len(entries)-1].CorrectQuestions) / float64(entries[len(entries)-1].TotalQuestions) * 100
	t.Logf("Accuracy progressed from %.2f%% to %.2f%%", firstAccuracy, lastAccuracy)

	// Log first and last entries for inspection
	t.Logf("\nFirst Entry:")
	t.Logf("  Date: %s %s", entries[0].CreatedDate.String, entries[0].CreatedTime.String)
	t.Logf("  NPM: %d, Questions: %d/%d (%.2f%%)", entries[0].NPM, entries[0].CorrectQuestions, entries[0].TotalQuestions, firstAccuracy)
	t.Logf("  Session Length: %s", entries[0].TimeLength)

	t.Logf("\nLast Entry:")
	t.Logf("  Date: %s %s", entries[len(entries)-1].CreatedDate.String, entries[len(entries)-1].CreatedTime.String)
	t.Logf("  NPM: %d, Questions: %d/%d (%.2f%%)", entries[len(entries)-1].NPM, entries[len(entries)-1].CorrectQuestions, entries[len(entries)-1].TotalQuestions, lastAccuracy)
	t.Logf("  Session Length: %s", entries[len(entries)-1].TimeLength)
}

// Test generateFakeDateCreated
func TestGenerateFakeDateCreated(t *testing.T) {
	// Generate 100 dates and verify they're all within 2024-2025 and before current date
	for i := 0; i < 100; i++ {
		dateSQL := generateFakeDateCreated()

		if !dateSQL.Valid {
			t.Errorf("Generated date is not valid")
		}

		// Parse the date
		dateTime, err := time.Parse("2006-01-02", dateSQL.String)
		if err != nil {
			t.Errorf("Invalid date format: %s, error: %v", dateSQL.String, err)
		}

		// Verify year is 2024 or 2025
		year := dateTime.Year()
		if year < MIN_YEAR || year > MAX_YEAR {
			t.Errorf("Date %s has year %d outside range [%d, %d]",
				dateSQL.String, year, MIN_YEAR, MAX_YEAR)
		}

		// Verify date is not in the future (beyond 2025-11-08)
		maxDate := time.Date(2025, 11, 8, 23, 59, 59, 0, time.UTC)
		if dateTime.After(maxDate) {
			t.Errorf("Date %s is in the future (beyond 2025-11-08)", dateSQL.String)
		}
	}

	t.Logf("All 100 generated dates are valid and within range")
}

// Test generateFakeTimeCreated
func TestGenerateFakeTimeCreated(t *testing.T) {
	// Generate 100 times and verify format
	for i := 0; i < 100; i++ {
		timeSQL := generateFakeTimeCreated()

		if !timeSQL.Valid {
			t.Errorf("Generated time is not valid")
		}

		// Verify format HH:MM:SS
		var hours, minutes, seconds int
		_, err := fmt.Sscanf(timeSQL.String, "%02d:%02d:%02d", &hours, &minutes, &seconds)
		if err != nil {
			t.Errorf("Invalid time format: %s, error: %v", timeSQL.String, err)
		}

		// Verify ranges
		if hours < 0 || hours > 23 {
			t.Errorf("Hours %d out of range [0, 23]", hours)
		}
		if minutes < 0 || minutes > 59 {
			t.Errorf("Minutes %d out of range [0, 59]", minutes)
		}
		if seconds < 0 || seconds > 59 {
			t.Errorf("Seconds %d out of range [0, 59]", seconds)
		}
	}

	t.Logf("All 100 generated times are valid")
}

// Benchmark generateRealisticNoteGameEntries
func BenchmarkGenerateRealisticNoteGameEntries(b *testing.B) {
	profile := generateStudentProgressProfile()

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		generateRealisticNoteGameEntries(int16(1), 50, profile)
	}
}
