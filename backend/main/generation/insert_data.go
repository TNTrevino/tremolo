package generation

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math/rand/v2"
	"sight-reading/database"
	"sight-reading/database/generated"
	"time"

	dtos "sight-reading/DTOs"
)

// insertRealisticEntries inserts multiple realistic entries for a student with progression
func insertRealisticEntries(studentID int32, entryCount int) {
	ctx := context.Background()

	// Generate a progress profile for this student
	profile := generateStudentProgressProfile()

	// Generate all entries with realistic progression
	entries := generateRealisticNoteGameEntries(int16(studentID), entryCount, profile)

	// Insert all entries
	for _, entry := range entries {
		err := entry.ValidateEntry()
		if err != nil {
			log.Printf(
				"Warning: entry validation failed for student %d: %v. Skipping entry.",
				studentID, err,
			)
			continue
		}

		// Parse the time_length string to time.Time
		timeLength, err := time.Parse("15:04:05", entry.TimeLength)
		if err != nil {
			log.Printf(
				"Warning: failed to parse time length for student %d: %v. Skipping entry.",
				studentID, err,
			)
			continue
		}

		// Parse CreatedDate and CreatedTime to sql.NullTime
		var createdDate sql.NullTime
		if entry.CreatedDate.Valid {
			parsedDate, err := time.Parse("2006-01-02", entry.CreatedDate.String)
			if err == nil {
				createdDate = sql.NullTime{Time: parsedDate, Valid: true}
			}
		}

		var createdTime sql.NullTime
		if entry.CreatedTime.Valid {
			parsedTime, err := time.Parse("15:04:05", entry.CreatedTime.String)
			if err == nil {
				createdTime = sql.NullTime{Time: parsedTime, Valid: true}
			}
		}

		params := generated.CreateNoteGameEntryWithDateParams{
			UserID:           studentID,
			TimeLength:       timeLength,
			TotalQuestions:   int32(entry.TotalQuestions),
			CorrectQuestions: int32(entry.CorrectQuestions),
			NotesPerMinute:   int32(entry.NPM),
			CreatedDate:      createdDate,
			CreatedTime:      createdTime,
		}

		_, err = database.Queries.CreateNoteGameEntryWithDate(ctx, params)
		if err != nil {
			log.Printf(
				"Warning: failed to insert entry for student %d: %v. Skipping entry.",
				studentID, err,
			)
			continue
		}
	}
}

// Adds fake schools to the data base
func insertFakeSchools() string {
	ctx := context.Background()

	for range 1000 {
		fakeSchool := generateFakeSchool()

		// Parse CreatedDate and CreatedTime to sql.NullTime
		var createdDate sql.NullTime
		if fakeSchool.CreatedDate.Valid {
			parsedDate, err := time.Parse("2006-01-02", fakeSchool.CreatedDate.String)
			if err == nil {
				createdDate = sql.NullTime{Time: parsedDate, Valid: true}
			}
		}

		var createdTime sql.NullTime
		if fakeSchool.CreatedTime.Valid {
			parsedTime, err := time.Parse("15:04:05", fakeSchool.CreatedTime.String)
			if err == nil {
				createdTime = sql.NullTime{Time: parsedTime, Valid: true}
			}
		}

		params := generated.CreateSchoolParams{
			Title:       fakeSchool.Title,
			City:        fakeSchool.City,
			County:      fakeSchool.County,
			State:       fakeSchool.State,
			Country:     fakeSchool.Country,
			CreatedTime: createdTime,
			CreatedDate: createdDate,
		}

		_, err := database.Queries.CreateSchool(ctx, params)
		if err != nil {
			log.Panicf(
				"an error ocurred inserting the school to the database. Error: %v",
				err.Error(),
			)
		}
	}
	return "school inserted successfully"
}

// insertFakeTeacherWithStudents creates one teacher with a specified number of students
func insertFakeTeacherWithStudents(studentsPerTeacher int) dtos.User {
	ctx := context.Background()

	schoolID := int16(rand.IntN(1000))
	teacher := generateFakeUser("TEACHER", schoolID)

	teacherParams := generated.CreateUserWithPasswordParams{
		FirstName: teacher.FirstName,
		LastName:  teacher.LastName,
		SchoolID:  sql.NullInt32{Int32: int32(teacher.SchoolID), Valid: true},
		Role:      sql.NullString{String: string(teacher.Role), Valid: true},
		Email:     sql.NullString{String: teacher.Email, Valid: true},
		Password:  teacher.PasswordHash,
	}

	teacherID, err := database.Queries.CreateUserWithPassword(ctx, teacherParams)
	if err != nil {
		log.Panic("teacher was not added to the db", err.Error())
	}

	for i := 0; i < studentsPerTeacher; i++ {
		student := generateFakeUser("STUDENT", schoolID)

		studentParams := generated.CreateUserWithPasswordParams{
			FirstName: student.FirstName,
			LastName:  student.LastName,
			SchoolID:  sql.NullInt32{Int32: int32(student.SchoolID), Valid: true},
			Role:      sql.NullString{String: string(student.Role), Valid: true},
			Email:     sql.NullString{String: student.Email, Valid: true},
			Password:  student.PasswordHash,
		}

		studentID, err := database.Queries.CreateUserWithPassword(ctx, studentParams)
		if err != nil {
			log.Panic("student was not added to the db", err.Error())
		}

		// Generate realistic entries with progression (20-100 entries per student)
		entryCount := 20 + rand.IntN(81)
		insertRealisticEntries(studentID, entryCount)
		if (i+1)%5 == 0 || i == studentsPerTeacher-1 {
			log.Printf("   Progress: %d/%d students created (last student: %d entries)",
				i+1, studentsPerTeacher, entryCount)
		}

		associationParams := generated.CreateTeacherStudentAssociationParams{
			TeacherID: teacherID,
			StudentID: studentID,
		}

		err = database.Queries.CreateTeacherStudentAssociation(ctx, associationParams)
		if err != nil {
			log.Panic("association from teacher to student was not added to db", err.Error())
		}
		fmt.Println("Teacher-student association created")
	}

	return teacher
}

// insertMultipleTeachersWithStudents creates multiple teachers, each with their own students
func insertMultipleTeachersWithStudents(teacherCount int, studentsPerTeacher int) string {
	log.Printf("Starting bulk data generation: %d teachers, %d students each...", teacherCount, studentsPerTeacher)
	log.Printf("Total users to create: %d teachers + %d students = %d users",
		teacherCount, teacherCount*studentsPerTeacher, teacherCount+teacherCount*studentsPerTeacher)
	log.Printf("Estimated entries per student: 20-100 (avg ~60)")
	log.Printf("Estimated total entries: %d - %d entries\n",
		teacherCount*studentsPerTeacher*20, teacherCount*studentsPerTeacher*100)

	for i := range teacherCount {
		log.Printf("[%d/%d] Creating teacher with %d students...", i+1, teacherCount, studentsPerTeacher)
		teacher := insertFakeTeacherWithStudents(studentsPerTeacher)
		log.Printf("Teacher %d: %s %s (ID assigned)", i+1, teacher.FirstName, teacher.LastName)
	}

	totalUsers := teacherCount + (teacherCount * studentsPerTeacher)
	log.Printf("\nData generation complete!")
	log.Printf("   Created: %d teachers", teacherCount)
	log.Printf("   Created: %d students", teacherCount*studentsPerTeacher)
	log.Printf("   Total users: %d", totalUsers)

	return fmt.Sprintf("Successfully created %d teachers with %d students each", teacherCount, studentsPerTeacher)
}
