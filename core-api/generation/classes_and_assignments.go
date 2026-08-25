package generation

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"math/rand/v2"
	"time"

	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/services"
)

// Fixed test credentials so a developer can log in and manually test the
// classes/assignments frontend without hunting through generated fake
// users. Re-running data-gen is a no-op once these exist (see
// insertClassesAndAssignments).
const (
	testTeacherEmail    = "teacher@test.com"
	testTeacherPassword = "TestTeacher1!"
	testStudentEmail    = "student@test.com"
	testStudentPassword = "TestStudent1!"

	// Join codes drawn from the same alphabet services.generateJoinCode
	// uses (no 0/O/1/I/L) so they're typeable and collide-free with
	// randomly generated codes.
	bandJoinCode = "BAND23"
	jazzJoinCode = "JAZZ88"
)

// insertClassesAndAssignments seeds a known TEACHER + STUDENT pair, two
// classes, a roster drawn from the already-generated fake students, a
// handful of assignments (both note-game and generic-game shapes), and
// tagged note_game_entries so the teacher results grid shows a mix of
// attempted/not-started students.
//
// Safe to re-run: if the test teacher already exists, seeding is skipped
// entirely rather than risk duplicate classes/join-code collisions.
func insertClassesAndAssignments(studentIDs []int32) {
	ctx := context.Background()

	if _, err := database.Queries.GetUserByEmail(ctx, sql.NullString{String: testTeacherEmail, Valid: true}); err == nil {
		log.Printf("Skipping classes/assignments seed: %s already exists", testTeacherEmail)
		return
	} else if !errors.Is(err, sql.ErrNoRows) {
		log.Printf("Warning: failed to check for existing test teacher, skipping classes/assignments seed: %v", err)
		return
	}

	teacherID := insertTestUser("Terry", "Director", testTeacherEmail, testTeacherPassword, "TEACHER")
	studentID := insertTestUser("Sam", "Student", testStudentEmail, testStudentPassword, "STUDENT")

	class1 := createClassWithCode(ctx, teacherID, "Symphonic Band", bandJoinCode)
	class2 := createClassWithCode(ctx, teacherID, "Jazz Ensemble", jazzJoinCode)

	// Enroll ~12 fake students + the test student into class 1, and the
	// next ~8 fake students into class 2.
	roster1 := takeStudents(studentIDs, 0, 12)
	roster2 := takeStudents(studentIDs, 12, 8)

	for _, sid := range roster1 {
		enrollStudent(ctx, class1, sid)
	}
	enrollStudent(ctx, class1, studentID)

	for _, sid := range roster2 {
		enrollStudent(ctx, class2, sid)
	}

	noteAssignment := createNoteAssignment(ctx, class1)
	createScaleAssignment(ctx, class1)
	createKeySignatureAssignment(ctx, class1)

	// Tag attempts for roughly half of class 1's roster (including the
	// test student) so the results grid shows a mix of attempted /
	// not-started students. Attempts are backdated across the past days
	// with gently rising accuracy so the drill-down chart shows a
	// believable improvement arc.
	attemptRoster := append([]int32{studentID}, roster1...)
	for i, sid := range attemptRoster {
		if i%2 != 0 {
			continue
		}
		attempts := 2 + rand.IntN(6) // 2-7 attempts over as many days
		for n := range attempts {
			insertAssignmentAttempt(ctx, sid, noteAssignment, n, attempts)
		}
	}

	log.Println("Classes & assignments seed complete!")
	log.Printf("   Test teacher: %s / %s (login to see %q and %q)", testTeacherEmail, testTeacherPassword, "Symphonic Band", "Jazz Ensemble")
	log.Printf("   Test student: %s / %s (enrolled in %q)", testStudentEmail, testStudentPassword, "Symphonic Band")
	log.Printf("   Join codes: Symphonic Band=%s, Jazz Ensemble=%s", bandJoinCode, jazzJoinCode)
}

// insertTestUser creates a user with a known email/password, hashing the
// password the same way insertPersonalUser does. Panics on failure since
// this is dev tooling and a partial seed is worse than a loud failure.
func insertTestUser(firstName, lastName, email, password, role string) int32 {
	ctx := context.Background()

	passwordHash, err := services.HashPassword(password)
	if err != nil {
		log.Panicf("Failed to hash password for test user %s: %v", email, err)
	}

	roleID := lookupRoleID(ctx, role)
	schoolID := int16(rand.IntN(1000) + 1)

	params := generated.CreateUserWithPasswordParams{
		FirstName: firstName,
		LastName:  lastName,
		SchoolID:  sql.NullInt32{Int32: int32(schoolID), Valid: true},
		RoleID:    roleID,
		Email:     sql.NullString{String: email, Valid: true},
		Password:  sql.NullString{String: passwordHash, Valid: true},
	}

	userID, err := database.Queries.CreateUserWithPassword(ctx, params)
	if err != nil {
		log.Panicf("Failed to insert test user %s: %v", email, err)
	}

	if err := services.CreateDefaultKeyboardBindings(ctx, database.Queries, int(userID)); err != nil {
		log.Printf("Warning: failed to seed default keyboard bindings for test user %d: %v", userID, err)
	}

	return userID
}

// createClassWithCode inserts a class with a fixed join code (rather than
// the service's random-with-retry generator) so the code is predictable
// for manual join-by-code testing.
func createClassWithCode(ctx context.Context, teacherID int32, name, joinCode string) int32 {
	class, err := database.Queries.CreateClass(ctx, generated.CreateClassParams{
		TeacherID: teacherID,
		Name:      name,
		JoinCode:  joinCode,
	})
	if err != nil {
		log.Panicf("Failed to insert class %q: %v", name, err)
	}
	return class.ID
}

func enrollStudent(ctx context.Context, classID, studentID int32) {
	err := database.Queries.AddStudentToClass(ctx, generated.AddStudentToClassParams{
		ClassID:   classID,
		StudentID: studentID,
	})
	if err != nil {
		log.Printf("Warning: failed to enroll student %d in class %d: %v", studentID, classID, err)
	}
}

// takeStudents returns up to n IDs from studentIDs starting at offset,
// clamped to the slice bounds (the fake-teacher generation step may
// produce fewer students than requested if it's tuned down).
func takeStudents(studentIDs []int32, offset, n int) []int32 {
	if offset >= len(studentIDs) {
		return nil
	}
	end := min(offset+n, len(studentIDs))
	return studentIDs[offset:end]
}

// createNoteAssignment creates the note-game assignment. Its config uses
// the snake_case shape of NoteGameSettingsRequest (frontend
// services/api/types/game.types.ts) since the note game stores settings
// differently from every other game.
func createNoteAssignment(ctx context.Context, classID int32) int32 {
	config, err := json.Marshal(map[string]any{
		"low_note":   "C4",
		"high_note":  "C5",
		"clef":       "treble",
		"game_mode":  "notes",
		"time_limit": 60,
		"note_limit": 25,
		"scale":      "C",
		"octave":     4,
	})
	if err != nil {
		log.Panicf("Failed to marshal note assignment config: %v", err)
	}

	dueAt := time.Now().AddDate(0, 0, 7)

	assignment, err := database.Queries.CreateAssignment(ctx, generated.CreateAssignmentParams{
		ClassID:        classID,
		Title:          "Note Reading Sprint",
		GameType:       "note",
		Config:         config,
		DueAt:          sql.NullTime{Time: dueAt, Valid: true},
		TargetAccuracy: sql.NullInt32{Int32: 80, Valid: true},
	})
	if err != nil {
		log.Panicf("Failed to insert note assignment: %v", err)
	}
	return assignment.ID
}

// createScaleAssignment creates a generic-game assignment. Its config
// mirrors scaleGame.defaults in
// frontend/src/features/identification-game/games/scale.ts (camelCase,
// game-owned shape) verbatim. No due date or targets, per the manual
// test matrix.
func createScaleAssignment(ctx context.Context, classID int32) int32 {
	config, err := json.Marshal(map[string]any{
		"gameMode":     "time",
		"timeLimit":    60,
		"noteLimit":    25,
		"clefs":        []string{"treble"},
		"scaleTypes":   []string{"major", "natural_minor", "harmonic_minor", "melodic_minor"},
		"questionMode": "accidentals",
	})
	if err != nil {
		log.Panicf("Failed to marshal scale assignment config: %v", err)
	}

	assignment, err := database.Queries.CreateAssignment(ctx, generated.CreateAssignmentParams{
		ClassID:  classID,
		Title:    "Scale Identification Warm-up",
		GameType: "scale",
		Config:   config,
	})
	if err != nil {
		log.Panicf("Failed to insert scale assignment: %v", err)
	}
	return assignment.ID
}

// createKeySignatureAssignment mirrors keySignatureGame.defaults in
// frontend/src/features/identification-game/games/keySignature.tsx.
// Has a due date and a target_questions but no target_accuracy, to cover
// a different corner of the targets matrix than the note assignment.
func createKeySignatureAssignment(ctx context.Context, classID int32) int32 {
	keySignatures := make([]int, 15)
	for i := range keySignatures {
		keySignatures[i] = i - 7
	}

	config, err := json.Marshal(map[string]any{
		"gameMode":      "time",
		"timeLimit":     30,
		"noteLimit":     25,
		"clefs":         []string{"treble"},
		"keySignatures": keySignatures,
		"noteNames":     "letters",
		"answerMode":    "major",
	})
	if err != nil {
		log.Panicf("Failed to marshal key signature assignment config: %v", err)
	}

	dueAt := time.Now().AddDate(0, 0, 3)

	assignment, err := database.Queries.CreateAssignment(ctx, generated.CreateAssignmentParams{
		ClassID:         classID,
		Title:           "Key Signature Check",
		GameType:        "key_signature",
		Config:          config,
		DueAt:           sql.NullTime{Time: dueAt, Valid: true},
		TargetQuestions: sql.NullInt32{Int32: 50, Valid: true},
	})
	if err != nil {
		log.Panicf("Failed to insert key signature assignment: %v", err)
	}
	return assignment.ID
}

// insertAssignmentAttempt inserts one plausible note_game_entries row
// tagged with assignmentID. game_type is "note" to match the note
// assignment it's attempting (entries must match their assignment's
// game_type for the results grid aggregation to pick them up).
//
// attemptIndex/attemptCount backdate the entry (oldest attempt first,
// one per day ending today) and scale accuracy upward across attempts
// so per-student attempt history reads as improvement, not noise.
// Direct SQL because the sqlc insert stamps created_date with now().
func insertAssignmentAttempt(
	ctx context.Context,
	studentID, assignmentID int32,
	attemptIndex, attemptCount int,
) {
	total := int32(15 + rand.IntN(26)) // 15-40 questions
	// Accuracy climbs from ~55-70% on the first attempt toward ~85-98%
	// on the last, with a little per-attempt jitter.
	progress := float64(attemptIndex) / float64(max(attemptCount-1, 1))
	accuracy := 0.55 + 0.35*progress + rand.Float64()*0.1
	correct := min(int32(float64(total)*accuracy), total)
	npm := int32(40+rand.IntN(31)) + int32(40*progress) // rises with practice
	seconds := 60 + rand.IntN(181)                      // 1-4 minutes
	timeLength := time.Date(0, 1, 1, 0, seconds/60, seconds%60, 0, time.UTC)
	attemptedAt := time.Now().AddDate(0, 0, attemptIndex-attemptCount+1)

	_, err := database.DBConn.ExecContext(ctx,
		`INSERT INTO tremolo.note_game_entries
			(user_id, time_length, total_questions, correct_questions,
			 notes_per_minute, game_type, assignment_id, created_date, created_time)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		studentID, timeLength, total, correct, npm, "note",
		assignmentID, attemptedAt, attemptedAt,
	)
	if err != nil {
		log.Printf("Warning: failed to insert assignment attempt for student %d: %v", studentID, err)
	}
}
