package generation

import (
	"database/sql"
	"fmt"
	"log"
	"math/rand/v2"
	"sight-reading/services"
	"time"

	dtos "sight-reading/DTOs"

	"github.com/manveru/faker"
)

// Constants for realistic data generation
// Note: Users enter notes at these speeds:
//   - Beginner: ~1 note/second = 60 NPM
//   - Intermediate: ~2 notes/second = 120 NPM
//   - Advanced: ~4 notes/second = 240 NPM (capped at 127 due to int8 database field)
const (
	// Notes Per Minute ranges (accounting for thinking time and UI interaction)
	// NOTE: NPM is stored as int8 in database (max 127), so we cap at 127
	MIN_NPM_BEGINNER     = 40  // ~0.67 notes/sec
	MAX_NPM_BEGINNER     = 80  // ~1.33 notes/sec
	MIN_NPM_INTERMEDIATE = 80  // ~1.33 notes/sec
	MAX_NPM_INTERMEDIATE = 110 // ~1.83 notes/sec
	MIN_NPM_ADVANCED     = 110 // ~1.83 notes/sec
	MAX_NPM_ADVANCED     = 127 // ~2.12 notes/sec (max int8 value)

	// Question count ranges based on session length (updated for int8 NPM cap of 127)
	// Short session: 5-10 minutes
	// Medium session: 10-20 minutes
	MIN_QUESTIONS_MEDIUM = 400  // 10 min * 40 NPM
	MAX_QUESTIONS_MEDIUM = 2200 // 20 min * 110 NPM
	// Long session: 20-45 minutes
	MIN_QUESTIONS_LONG = 800  // 20 min * 40 NPM
	MAX_QUESTIONS_LONG = 5715 // 45 min * 127 NPM

	// Accuracy ranges (as percentage 0-100)
	MIN_ACCURACY_BAD_DAY      = 30 // Struggling / bad day
	MIN_ACCURACY_BEGINNER     = 40
	MAX_ACCURACY_BEGINNER     = 70
	MIN_ACCURACY_INTERMEDIATE = 65
	MAX_ACCURACY_INTERMEDIATE = 85
	MIN_ACCURACY_ADVANCED     = 80
	MAX_ACCURACY_ADVANCED     = 98

	// Session length ranges (minutes)
	MIN_SESSION_LENGTH = 1
	MAX_SESSION_LENGTH = 5

	// Date ranges
	MIN_YEAR = 2024
	MAX_YEAR = 2025

	// Probability for bad day performance
	BAD_DAY_PROBABILITY = 0.15 // 15% chance of bad day
)

// type fakeParentToChildAssociation struct {
// 	ParentID int `db:"parent_id"`
// 	ChildID  int `db:"child_id"`
// }
//
// type fakeTeacherToParent struct {
// 	TeacherID int `db:"teacher_id"`
// 	ParentID  int `db:"parent_id"`
// }

type fakeTeacherToStudent struct {
	TeacherID int `db:"teacher_id"`
	StudentID int `db:"student_id"`
}

var fake *faker.Faker

// SkillLevel represents the proficiency level of a student
type SkillLevel int

const (
	SkillBeginner SkillLevel = iota
	SkillIntermediate
	SkillAdvanced
)

// ImprovementRate represents how fast a student improves
type ImprovementRate int

const (
	ImprovementSlow ImprovementRate = iota
	ImprovementMedium
	ImprovementFast
)

// StudentProgressProfile defines a student's skill trajectory
type StudentProgressProfile struct {
	BaseSkillLevel       SkillLevel
	ImprovementRate      ImprovementRate
	BaseNPM              int     // Starting notes per minute
	BaseAccuracy         float64 // Starting accuracy (0-100)
	NPMGrowthPerDay      float64 // How much NPM increases per day
	AccuracyGrowthPerDay float64 // How much accuracy increases per day
	Consistency          float64 // 0-1, higher = more consistent performance
}

// Helper function: Check if we should simulate a bad day
func shouldDecreasePerformance(probability float64) bool {
	return rand.Float64() < probability
}

// Helper function: Generate a date within a specific range
func generateDateInRange(startDate, endDate time.Time) time.Time {
	delta := endDate.Unix() - startDate.Unix()
	sec := rand.Int64N(delta)
	return startDate.Add(time.Duration(sec) * time.Second)
}

// Helper function: Generate chronologically sorted dates
func generateChronologicalDates(count int, startDate, endDate time.Time) []time.Time {
	dates := make([]time.Time, count)

	// Generate random dates
	for i := 0; i < count; i++ {
		dates[i] = generateDateInRange(startDate, endDate)
	}

	// Sort chronologically using a simple bubble sort
	for i := 0; i < len(dates)-1; i++ {
		for j := 0; j < len(dates)-i-1; j++ {
			if dates[j].After(dates[j+1]) {
				dates[j], dates[j+1] = dates[j+1], dates[j]
			}
		}
	}

	return dates
}

// Helper function: Generate realistic NPM based on skill level with variance
func generateRealisticNPM(skillLevel SkillLevel, variance float64) int {
	var baseNPM int
	var minNPM, maxNPM int

	switch skillLevel {
	case SkillBeginner:
		minNPM = MIN_NPM_BEGINNER
		maxNPM = MAX_NPM_BEGINNER
		baseNPM = (minNPM + maxNPM) / 2
	case SkillIntermediate:
		minNPM = MIN_NPM_INTERMEDIATE
		maxNPM = MAX_NPM_INTERMEDIATE
		baseNPM = (minNPM + maxNPM) / 2
	case SkillAdvanced:
		minNPM = MIN_NPM_ADVANCED
		maxNPM = MAX_NPM_ADVANCED
		baseNPM = (minNPM + maxNPM) / 2
	}

	// Apply variance (variance is a percentage, e.g., 0.2 for ±20%)
	varianceAmount := int(float64(baseNPM) * variance)
	npmWithVariance := baseNPM + rand.IntN(varianceAmount*2+1) - varianceAmount

	// Ensure we stay within bounds
	if npmWithVariance < minNPM {
		npmWithVariance = minNPM
	}
	if npmWithVariance > maxNPM {
		npmWithVariance = maxNPM
	}

	return npmWithVariance
}

// Helper function: Generate realistic question count based on session length and NPM
func generateRealisticQuestionCount(sessionLengthMinutes int, npm int) int {
	// Calculate expected questions: sessionLength (min) * NPM
	expectedQuestions := sessionLengthMinutes * npm

	// Add some variance (±15%)
	variance := int(float64(expectedQuestions) * 0.15)
	actualQuestions := max(
		// Ensure minimum of 10 questions
		expectedQuestions+rand.IntN(variance*2+1)-variance, 10)

	return actualQuestions
}

// Helper function: Generate realistic accuracy score with variance
func generateAccuracyScore(baseAccuracy float64, variance float64) float64 {
	// Apply variance
	varianceAmount := baseAccuracy * variance
	accuracy := baseAccuracy + (rand.Float64()*varianceAmount*2 - varianceAmount)

	// Clamp between reasonable bounds
	if accuracy < 30.0 {
		accuracy = 30.0
	}
	if accuracy > 98.0 {
		accuracy = 98.0
	}

	return accuracy
}

// Helper function: Calculate session length based on questions and NPM
func calculateSessionLength(totalQuestions int, npm int) string {
	// Calculate minutes: totalQuestions / NPM
	minutes := totalQuestions / npm
	if minutes < 1 {
		minutes = 1
	}

	// Add some random seconds for realism
	seconds := rand.IntN(60)

	return fmt.Sprintf("%02d:%02d:%02d", 0, minutes, seconds)
}

// Helper function: Generate a student progress profile
func generateStudentProgressProfile() StudentProgressProfile {
	// Randomly select skill level
	skillRand := rand.IntN(100)
	var skillLevel SkillLevel
	var baseNPM int
	var baseAccuracy float64

	if skillRand < 40 { // 40% beginners
		skillLevel = SkillBeginner
		baseNPM = MIN_NPM_BEGINNER + rand.IntN(MAX_NPM_BEGINNER-MIN_NPM_BEGINNER)
		baseAccuracy = float64(MIN_ACCURACY_BEGINNER + rand.IntN(MAX_ACCURACY_BEGINNER-MIN_ACCURACY_BEGINNER))
	} else if skillRand < 80 { // 40% intermediate
		skillLevel = SkillIntermediate
		baseNPM = MIN_NPM_INTERMEDIATE + rand.IntN(MAX_NPM_INTERMEDIATE-MIN_NPM_INTERMEDIATE)
		baseAccuracy = float64(MIN_ACCURACY_INTERMEDIATE + rand.IntN(MAX_ACCURACY_INTERMEDIATE-MIN_ACCURACY_INTERMEDIATE))
	} else { // 20% advanced
		skillLevel = SkillAdvanced
		baseNPM = MIN_NPM_ADVANCED + rand.IntN(MAX_NPM_ADVANCED-MIN_NPM_ADVANCED)
		baseAccuracy = float64(MIN_ACCURACY_ADVANCED + rand.IntN(MAX_ACCURACY_ADVANCED-MIN_ACCURACY_ADVANCED))
	}

	// Randomly select improvement rate
	improvementRand := rand.IntN(3)
	var improvementRate ImprovementRate
	var npmGrowth, accuracyGrowth float64

	switch improvementRand {
	case 0: // Slow learner
		improvementRate = ImprovementSlow
		npmGrowth = 0.1       // Gains 0.1 NPM per day
		accuracyGrowth = 0.02 // Gains 0.02% accuracy per day
	case 1: // Medium learner
		improvementRate = ImprovementMedium
		npmGrowth = 0.3
		accuracyGrowth = 0.05
	case 2: // Fast learner
		improvementRate = ImprovementFast
		npmGrowth = 0.6
		accuracyGrowth = 0.1
	}

	// Generate consistency (0.5 to 1.0, higher = more consistent)
	consistency := 0.5 + rand.Float64()*0.5

	return StudentProgressProfile{
		BaseSkillLevel:       skillLevel,
		ImprovementRate:      improvementRate,
		BaseNPM:              baseNPM,
		BaseAccuracy:         baseAccuracy,
		NPMGrowthPerDay:      npmGrowth,
		AccuracyGrowthPerDay: accuracyGrowth,
		Consistency:          consistency,
	}
}

// Main function: Generate realistic note game entries with progress over time
func generateRealisticNoteGameEntries(studentID int16, entryCount int, profile StudentProgressProfile) []dtos.Entry {
	entries := make([]dtos.Entry, entryCount)

	// Define date range (2024-01-01 to today or 2025-11-08)
	startDate := time.Date(MIN_YEAR, 1, 1, 0, 0, 0, 0, time.UTC)
	endDate := time.Date(MAX_YEAR, 11, 8, 23, 59, 59, 0, time.UTC) // Today's date from env

	// Generate chronological dates
	dates := generateChronologicalDates(entryCount, startDate, endDate)

	// Generate entries with realistic progress
	for i := 0; i < entryCount; i++ {
		entryDate := dates[i]

		// Calculate days since start
		daysSinceStart := entryDate.Sub(startDate).Hours() / 24

		// Calculate current skill level with growth
		currentNPM := profile.BaseNPM + int(daysSinceStart*profile.NPMGrowthPerDay)
		currentAccuracy := profile.BaseAccuracy + (daysSinceStart * profile.AccuracyGrowthPerDay)

		// Apply consistency variance
		npmVariance := (1.0 - profile.Consistency) * 0.3 // Less consistent = more variance
		accuracyVariance := (1.0 - profile.Consistency) * 0.2

		// Calculate NPM variance range, ensuring it's at least 1 to avoid IntN(0) panic
		npmVarianceRange := int(float64(currentNPM) * npmVariance * 2)
		if npmVarianceRange < 1 {
			npmVarianceRange = 1
		}
		actualNPM := currentNPM + rand.IntN(npmVarianceRange) - int(float64(currentNPM)*npmVariance)
		actualAccuracy := currentAccuracy + (rand.Float64()*currentAccuracy*accuracyVariance*2 - currentAccuracy*accuracyVariance)

		// Check for bad day (reduces performance)
		if shouldDecreasePerformance(BAD_DAY_PROBABILITY) {
			actualNPM = int(float64(actualNPM) * 0.7) // 30% reduction
			actualAccuracy = actualAccuracy * 0.8     // 20% reduction
			if actualAccuracy < MIN_ACCURACY_BAD_DAY {
				actualAccuracy = float64(MIN_ACCURACY_BAD_DAY)
			}
		}

		// Clamp NPM to valid range
		if actualNPM < MIN_NPM_BEGINNER {
			actualNPM = MIN_NPM_BEGINNER
		}
		if actualNPM > MAX_NPM_ADVANCED {
			actualNPM = MAX_NPM_ADVANCED
		}

		// Clamp accuracy
		if actualAccuracy < 30 {
			actualAccuracy = 30
		}
		if actualAccuracy > 98 {
			actualAccuracy = 98
		}

		// Generate session length (5-45 minutes)
		sessionLength := MIN_SESSION_LENGTH + rand.IntN(MAX_SESSION_LENGTH-MIN_SESSION_LENGTH)

		// Calculate total questions based on session and NPM
		totalQuestions := generateRealisticQuestionCount(sessionLength, actualNPM)

		// Calculate correct questions based on accuracy
		correctQuestions := int(float64(totalQuestions) * (actualAccuracy / 100.0))

		// Generate time length string
		timeLength := fmt.Sprintf("%02d:%02d:%02d", 0, sessionLength, rand.IntN(60))

		// Create entry
		entries[i] = dtos.Entry{
			TimeLength:       timeLength,
			TotalQuestions:   int16(totalQuestions),
			CorrectQuestions: int16(correctQuestions),
			NPM:              int8(actualNPM),
			UserID:           studentID,
			CreatedDate: sql.NullString{
				String: entryDate.Format("2006-01-02"),
				Valid:  true,
			},
			CreatedTime: sql.NullString{
				String: entryDate.Format("15:04:05"),
				Valid:  true,
			},
		}
	}

	return entries
}

func initFaker() {
	var err error
	fake, err = faker.New("en")
	if err != nil {
		log.Fatal("Did not instantiate faker")
		panic(err)
	}
}

func generateFakeSchool() dtos.School {
	num := rand.IntN(3)

	prefix := fake.FirstName()

	suffix := " Middle School"

	if num == 0 {
		suffix = " High School"
	}

	if num < 2 {
		prefix += " " + fake.LastName()
	}

	return dtos.School{
		Title:       prefix + suffix,
		City:        fake.City(),
		County:      fake.City(),
		State:       fake.State(),
		Country:     fake.Country(),
		CreatedDate: generateFakeDateCreated(),
		CreatedTime: generateFakeTimeCreated(),
	}
}

func generateFakeUser(role dtos.Role, schoolID int16) dtos.User {
	// Generate first name with retry logic
	fakeFirstName := fake.FirstName()
	if fakeFirstName == "" {
		fakeFirstName = "Student" // Fallback
	}

	// Generate last name with retry logic (removed "x" workaround)
	fakeLastName := fake.LastName()
	if fakeLastName == "" {
		// Retry once
		fakeLastName = fake.LastName()
		if fakeLastName == "" {
			// Fallback to a default last name
			fakeLastName = "User"
		}
	}

	fakeEmail := fakeFirstName + "." + fakeLastName + "@email.com"

	// Hash the default password "password123" for all fake users
	passwordHash, err := services.HashPassword("password123")
	if err != nil {
		log.Printf("Failed to hash password: %v", err)
		return dtos.User{}
	}

	user := dtos.User{
		FirstName:    fakeFirstName,
		LastName:     fakeLastName,
		Email:        fakeEmail,
		PasswordHash: passwordHash,
		Role:         role,
		SchoolID:     schoolID,
		CreatedDate:  generateFakeDateCreated(),
		CreatedTime:  generateFakeTimeCreated(),
	}

	err = user.ValidateUser()
	if err != nil {
		// TODO: better error handling
		log.Printf("User validation failed: %v", err)
		return dtos.User{}
	}

	return user
}

func generateFakeEntryTimeLength() string {
	hourAmount := rand.IntN(2)
	minutes := rand.IntN(60)
	seconds := rand.IntN(60)

	timeFormat := fmt.Sprintf("%02d:%02d:%02d", hourAmount, minutes, seconds)

	return timeFormat
}

func generateFakeDateCreated() sql.NullString {
	// Generate dates in 2024-2025 range, up to current date (2025-11-08)
	year := MIN_YEAR + rand.IntN(MAX_YEAR-MIN_YEAR+1)
	month := rand.IntN(12) + 1
	day := rand.IntN(28) + 1 // Use 28 to avoid invalid dates

	// If year is 2025, ensure we don't go beyond current date (Nov 8)
	if year == 2025 && month > 11 {
		month = 11
	}
	if year == 2025 && month == 11 && day > 8 {
		day = 8
	}

	timeFormat := fmt.Sprintf("%04d-%02d-%02d", year, month, day)

	return sql.NullString{
		String: timeFormat,
		Valid:  true,
	}
}

func generateFakeTimeCreated() sql.NullString {
	hourAmount := rand.IntN(24)
	minutes := rand.IntN(60)
	seconds := rand.IntN(60)

	timeFormat := fmt.Sprintf("%02d:%02d:%02d", hourAmount, minutes, seconds)

	return sql.NullString{
		String: timeFormat,
		Valid:  true,
	}
}
