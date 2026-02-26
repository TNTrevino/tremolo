package generation

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math/rand/v2"
	"os"
	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/services"
	"strings"
	"time"

	dtos "sight-reading/DTOs"
)

// insertRealisticEntries generates entries for a student and batch-inserts them
// in a single multi-row INSERT to avoid per-row round-trips.
func insertRealisticEntries(studentID int32, entryCount int) {
	profile := generateStudentProgressProfile()
	entries := generateRealisticNoteGameEntries(int16(studentID), entryCount, profile)

	var valueClauses []string
	var args []interface{}
	argIdx := 1

	for _, entry := range entries {
		if err := entry.ValidateEntry(); err != nil {
			continue
		}

		timeLength, err := time.Parse("15:04:05", entry.TimeLength)
		if err != nil {
			continue
		}

		var createdDate, createdTime interface{}
		if entry.CreatedDate.Valid {
			if d, err := time.Parse("2006-01-02", entry.CreatedDate.String); err == nil {
				createdDate = d
			}
		}
		if entry.CreatedTime.Valid {
			if t, err := time.Parse("15:04:05", entry.CreatedTime.String); err == nil {
				createdTime = t
			}
		}

		valueClauses = append(valueClauses, fmt.Sprintf(
			"($%d, $%d, $%d, $%d, $%d, $%d, $%d)",
			argIdx, argIdx+1, argIdx+2, argIdx+3, argIdx+4, argIdx+5, argIdx+6,
		))
		args = append(args, studentID, timeLength, int32(entry.TotalQuestions),
			int32(entry.CorrectQuestions), int32(entry.NPM), createdDate, createdTime)
		argIdx += 7
	}

	if len(valueClauses) == 0 {
		return
	}

	query := "INSERT INTO tremolo.note_game_entries (user_id, time_length, total_questions, correct_questions, notes_per_minute, created_date, created_time) VALUES " +
		strings.Join(valueClauses, ", ")

	_, err := database.DBConn.ExecContext(context.Background(), query, args...)
	if err != nil {
		log.Printf("Warning: batch insert failed for student %d: %v", studentID, err)
	}
}

// insertFakeSchools batch-inserts 1000 fake schools in a single statement.
func insertFakeSchools() string {
	var valueClauses []string
	var args []interface{}
	argIdx := 1

	for range 1000 {
		s := generateFakeSchool()

		var createdDate, createdTime interface{}
		if s.CreatedDate.Valid {
			if d, err := time.Parse("2006-01-02", s.CreatedDate.String); err == nil {
				createdDate = d
			}
		}
		if s.CreatedTime.Valid {
			if t, err := time.Parse("15:04:05", s.CreatedTime.String); err == nil {
				createdTime = t
			}
		}

		valueClauses = append(valueClauses, fmt.Sprintf(
			"($%d, $%d, $%d, $%d, $%d, $%d, $%d)",
			argIdx, argIdx+1, argIdx+2, argIdx+3, argIdx+4, argIdx+5, argIdx+6,
		))
		args = append(args, s.Title, s.City, s.County, s.State, s.Country, createdTime, createdDate)
		argIdx += 7
	}

	query := "INSERT INTO tremolo.schools (title, city, county, state, country, created_time, created_date) VALUES " +
		strings.Join(valueClauses, ", ")

	_, err := database.DBConn.ExecContext(context.Background(), query, args...)
	if err != nil {
		log.Panicf("batch school insert failed: %v", err)
	}

	return "1000 schools inserted successfully"
}

// insertFakeTeacherWithStudents creates one teacher with a specified number of students.
// Returns the teacher DTO, the teacher's database ID, and a slice of student IDs.
func lookupRoleID(ctx context.Context, roleName string) int32 {
	roleID, err := database.Queries.GetRoleIDByName(ctx, roleName)
	if err != nil {
		log.Panicf("failed to look up role ID for %q: %v", roleName, err)
	}
	return roleID
}

func insertFakeTeacherWithStudents(studentsPerTeacher int) (dtos.User, int32, []int32) {
	ctx := context.Background()

	teacherRoleID := lookupRoleID(ctx, "TEACHER")
	studentRoleID := lookupRoleID(ctx, "STUDENT")

	schoolID := int16(rand.IntN(1000) + 1)
	teacher := generateFakeUser("TEACHER", schoolID)

	teacherParams := generated.CreateUserWithPasswordParams{
		FirstName: teacher.FirstName,
		LastName:  teacher.LastName,
		SchoolID:  sql.NullInt32{Int32: int32(teacher.SchoolID), Valid: true},
		RoleID:    teacherRoleID,
		Email:     sql.NullString{String: teacher.Email, Valid: true},
		Password:  teacher.PasswordHash,
	}

	teacherID, err := database.Queries.CreateUserWithPassword(ctx, teacherParams)
	if err != nil {
		log.Panicf("teacher was not added to the db: %v", err)
	}

	var studentIDs []int32

	for i := 0; i < studentsPerTeacher; i++ {
		student := generateFakeUser("STUDENT", schoolID)

		studentParams := generated.CreateUserWithPasswordParams{
			FirstName: student.FirstName,
			LastName:  student.LastName,
			SchoolID:  sql.NullInt32{Int32: int32(student.SchoolID), Valid: true},
			RoleID:    studentRoleID,
			Email:     sql.NullString{String: student.Email, Valid: true},
			Password:  student.PasswordHash,
		}

		studentID, err := database.Queries.CreateUserWithPassword(ctx, studentParams)
		if err != nil {
			log.Panicf("student was not added to the db (schoolID=%d): %v", student.SchoolID, err)
		}

		studentIDs = append(studentIDs, studentID)

		entryCount := 20 + rand.IntN(81)
		insertRealisticEntries(studentID, entryCount)

		associationParams := generated.CreateTeacherStudentAssociationParams{
			TeacherID: teacherID,
			StudentID: studentID,
		}

		err = database.Queries.CreateTeacherStudentAssociation(ctx, associationParams)
		if err != nil {
			log.Panicf("association from teacher to student was not added to db: %v", err)
		}

		if (i+1)%5 == 0 || i == studentsPerTeacher-1 {
			log.Printf("   %d/%d students created (%d note game entries inserted)",
				i+1, studentsPerTeacher, entryCount)
		}
	}

	return teacher, teacherID, studentIDs
}

// insertPersonalUser creates a user from TREMOLO_ environment variables.
// Returns the user's database ID, or 0 if the env vars aren't set.
func insertPersonalUser(schoolID int16) int32 {
	email := os.Getenv("TREMOLO_DATABASE_USER")
	password := os.Getenv("TREMOLO_DATABASE_PW")
	firstName := os.Getenv("TREMOLO_FIRST_NAME")
	lastName := os.Getenv("TREMOLO_LAST_NAME")

	if email == "" || password == "" || firstName == "" || lastName == "" {
		log.Println("Skipping personal user: TREMOLO_DATABASE_USER, TREMOLO_DATABASE_PW, TREMOLO_FIRST_NAME, or TREMOLO_LAST_NAME not set")
		return 0
	}

	ctx := context.Background()

	passwordHash, err := services.HashPassword(password)
	if err != nil {
		log.Panicf("Failed to hash password for personal user: %v", err)
	}

	teacherRoleID := lookupRoleID(ctx, "TEACHER")

	params := generated.CreateUserWithPasswordParams{
		FirstName: firstName,
		LastName:  lastName,
		SchoolID:  sql.NullInt32{Int32: int32(schoolID), Valid: true},
		RoleID:    teacherRoleID,
		Email:     sql.NullString{String: email, Valid: true},
		Password:  passwordHash,
	}

	userID, err := database.Queries.CreateUserWithPassword(ctx, params)
	if err != nil {
		log.Panicf("Failed to insert personal user: %v", err)
	}

	log.Printf("Personal user created: %s %s (ID: %d)", firstName, lastName, userID)
	return userID
}

// insertFriendsForUser creates mutual friend relationships between the given user
// and a random subset of the provided user IDs.
func insertFriendsForUser(userID int32, candidateIDs []int32, friendCount int) {
	ctx := context.Background()

	if friendCount > len(candidateIDs) {
		friendCount = len(candidateIDs)
	}

	// Shuffle and pick the first friendCount candidates
	shuffled := make([]int32, len(candidateIDs))
	copy(shuffled, candidateIDs)
	rand.Shuffle(len(shuffled), func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	for _, friendID := range shuffled[:friendCount] {
		// Insert both directions so the mutual-follow query picks them up
		forward := generated.CreateFriendshipParams{UserID: userID, FriendID: friendID}
		reverse := generated.CreateFriendshipParams{UserID: friendID, FriendID: userID}

		if err := database.Queries.CreateFriendship(ctx, forward); err != nil {
			log.Printf("Warning: failed to create friendship %d->%d: %v", userID, friendID, err)
			continue
		}
		if err := database.Queries.CreateFriendship(ctx, reverse); err != nil {
			log.Printf("Warning: failed to create friendship %d->%d: %v", friendID, userID, err)
			continue
		}
	}

	log.Printf("Created %d mutual friendships for user %d", friendCount, userID)
}

// assignStudentsToUser creates teacher-student associations between the given
// teacher and a random subset of the provided student IDs.
func assignStudentsToUser(teacherID int32, candidateStudentIDs []int32, studentCount int) {
	ctx := context.Background()

	if studentCount > len(candidateStudentIDs) {
		studentCount = len(candidateStudentIDs)
	}

	shuffled := make([]int32, len(candidateStudentIDs))
	copy(shuffled, candidateStudentIDs)
	rand.Shuffle(len(shuffled), func(i, j int) {
		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]
	})

	for _, studentID := range shuffled[:studentCount] {
		params := generated.CreateTeacherStudentAssociationParams{
			TeacherID: teacherID,
			StudentID: studentID,
		}
		if err := database.Queries.CreateTeacherStudentAssociation(ctx, params); err != nil {
			log.Printf("Warning: failed to assign student %d to teacher %d: %v", studentID, teacherID, err)
			continue
		}
	}

	log.Printf("Assigned %d students to teacher %d", studentCount, teacherID)
}

// insertMultipleTeachersWithStudents creates multiple teachers, each with their own students.
// Returns separate slices for teacher IDs and student IDs.
func insertMultipleTeachersWithStudents(teacherCount int, studentsPerTeacher int) ([]int32, []int32) {
	log.Printf("Starting bulk data generation: %d teachers, %d students each...", teacherCount, studentsPerTeacher)
	log.Printf("Total users to create: %d teachers + %d students = %d users",
		teacherCount, teacherCount*studentsPerTeacher, teacherCount+teacherCount*studentsPerTeacher)
	log.Printf("Estimated entries per student: 20-100 (avg ~60)")
	log.Printf("Estimated total entries: %d - %d entries\n",
		teacherCount*studentsPerTeacher*20, teacherCount*studentsPerTeacher*100)

	var teacherIDs []int32
	var studentIDs []int32

	for i := range teacherCount {
		log.Printf("[%d/%d] Creating teacher with %d students...", i+1, teacherCount, studentsPerTeacher)
		teacher, teacherID, students := insertFakeTeacherWithStudents(studentsPerTeacher)
		teacherIDs = append(teacherIDs, teacherID)
		studentIDs = append(studentIDs, students...)
		log.Printf("Teacher %d: %s %s (ID assigned)", i+1, teacher.FirstName, teacher.LastName)
	}

	totalUsers := teacherCount + (teacherCount * studentsPerTeacher)
	log.Printf("\nData generation complete!")
	log.Printf("   Created: %d teachers", teacherCount)
	log.Printf("   Created: %d students", teacherCount*studentsPerTeacher)
	log.Printf("   Total users: %d", totalUsers)

	return teacherIDs, studentIDs
}
