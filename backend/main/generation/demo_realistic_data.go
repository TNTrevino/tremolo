package generation

import (
	"fmt"
	"log"
)

// DemoRealisticDataGeneration shows how the new realistic data generation works
func DemoRealisticDataGeneration() {
	fmt.Println("\n" + "==============================================")
	fmt.Println("    REALISTIC DATA GENERATION DEMO")
	fmt.Println("==============================================")
	fmt.Println()

	// Demo 1: Student Progress Profile
	fmt.Println("1. Generating Student Progress Profiles:")
	fmt.Println("   These profiles determine how a student improves over time")
	fmt.Println()

	for i := 0; i < 3; i++ {
		profile := generateStudentProgressProfile()
		skillName := []string{"Beginner", "Intermediate", "Advanced"}[profile.BaseSkillLevel]
		improvementName := []string{"Slow", "Medium", "Fast"}[profile.ImprovementRate]

		fmt.Printf("   Student %d:\n", i+1)
		fmt.Printf("     - Skill Level: %s\n", skillName)
		fmt.Printf("     - Base NPM: %d notes/minute\n", profile.BaseNPM)
		fmt.Printf("     - Base Accuracy: %.1f%%\n", profile.BaseAccuracy)
		fmt.Printf("     - Improvement Rate: %s learner\n", improvementName)
		fmt.Printf("     - NPM Growth: +%.2f per day\n", profile.NPMGrowthPerDay)
		fmt.Printf("     - Accuracy Growth: +%.2f%% per day\n", profile.AccuracyGrowthPerDay)
		fmt.Printf("     - Consistency: %.2f (0=erratic, 1=very consistent)\n\n", profile.Consistency)
	}

	// Demo 2: Generate realistic entries for one student
	fmt.Println("\n2. Generating Realistic Note Game Entries:")
	fmt.Println("   Showing progression over time with occasional 'bad days'")
	fmt.Println()

	profile := StudentProgressProfile{
		BaseSkillLevel:       SkillBeginner,
		ImprovementRate:      ImprovementMedium,
		BaseNPM:              50,
		BaseAccuracy:         55.0,
		NPMGrowthPerDay:      0.3,
		AccuracyGrowthPerDay: 0.05,
		Consistency:          0.75,
	}

	entries := generateRealisticNoteGameEntries(1, 10, profile)

	fmt.Println("   Sample Student (Beginner, Medium Learner):")
	fmt.Println("   Starting: 50 NPM, 55% accuracy")
	fmt.Println("   Growth: +0.3 NPM/day, +0.05% accuracy/day")
	fmt.Println()

	fmt.Println("   Entry | Date       | NPM | Questions  | Accuracy | Session")
	fmt.Println("   ------|------------|-----|------------|----------|--------")

	for i, entry := range entries {
		accuracy := float64(entry.CorrectQuestions) / float64(entry.TotalQuestions) * 100
		fmt.Printf("   %-5d | %s | %-3d | %4d/%-5d | %5.1f%%  | %s\n",
			i+1,
			entry.CreatedDate.String,
			entry.NPM,
			entry.CorrectQuestions,
			entry.TotalQuestions,
			accuracy,
			entry.TimeLength,
		)
	}

	// Calculate improvement
	firstAccuracy := float64(entries[0].CorrectQuestions) / float64(entries[0].TotalQuestions) * 100
	lastAccuracy := float64(entries[len(entries)-1].CorrectQuestions) / float64(entries[len(entries)-1].TotalQuestions) * 100
	npmImprovement := int(entries[len(entries)-1].NPM) - int(entries[0].NPM)
	accuracyImprovement := lastAccuracy - firstAccuracy

	fmt.Printf("\n   📊 Progress Summary:\n")
	fmt.Printf("      NPM: %d → %d (+%d)\n", entries[0].NPM, entries[len(entries)-1].NPM, npmImprovement)
	fmt.Printf("      Accuracy: %.1f%% → %.1f%% (+%.1f%%)\n", firstAccuracy, lastAccuracy, accuracyImprovement)

	// Demo 3: Show correlation between metrics
	fmt.Println("\n\n3. Demonstrating Data Correlation:")
	fmt.Println("   Our data now has realistic relationships:")
	fmt.Println()

	entry := entries[5]
	sessionMinutes := 20
	expectedQuestions := sessionMinutes * int(entry.NPM)
	actualQuestions := int(entry.TotalQuestions)
	variance := float64(actualQuestions-expectedQuestions) / float64(expectedQuestions) * 100

	fmt.Printf("   Example Entry Analysis:\n")
	fmt.Printf("     - Session Length: ~%d minutes\n", sessionMinutes)
	fmt.Printf("     - NPM: %d notes/minute\n", entry.NPM)
	fmt.Printf("     - Expected Questions: ~%d\n", expectedQuestions)
	fmt.Printf("     - Actual Questions: %d\n", actualQuestions)
	fmt.Printf("     - Variance: %.1f%% (realistic variance)\n", variance)
	fmt.Printf("     - Accuracy: %.1f%% (based on skill level)\n",
		float64(entry.CorrectQuestions)/float64(entry.TotalQuestions)*100)

	// Demo 4: Bad Days
	fmt.Println("\n\n4. Simulating 'Bad Days' (15% probability):")
	fmt.Println("   Testing performance decrease simulation")
	fmt.Println()

	badDayCount := 0
	totalTests := 1000
	for i := 0; i < totalTests; i++ {
		if shouldDecreasePerformance(BAD_DAY_PROBABILITY) {
			badDayCount++
		}
	}

	fmt.Printf("   Out of %d practice sessions:\n", totalTests)
	fmt.Printf("     - Good days: %d (%.1f%%)\n", totalTests-badDayCount, float64(totalTests-badDayCount)/float64(totalTests)*100)
	fmt.Printf("     - Bad days: %d (%.1f%%)\n", badDayCount, float64(badDayCount)/float64(totalTests)*100)
	fmt.Printf("   This adds realism - even good students have off days!\n")

	fmt.Println("\n" + "==============================================")
	fmt.Println("    Demo Complete!")
	fmt.Println("==============================================")
	fmt.Println()
}

// RunDemo is a standalone function to run the demo
func RunDemo() {
	initFaker()
	log.Println("Initializing faker...")
	DemoRealisticDataGeneration()
}
