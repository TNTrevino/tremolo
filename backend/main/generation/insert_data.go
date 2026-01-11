package generation

import (
	"fmt"
	"log"
	"math/rand/v2"
	"sight-reading/database"

	dtos "sight-reading/DTOs"
)

// insertRealisticEntries inserts multiple realistic entries for a student with progression
func insertRealisticEntries(studentID int16, entryCount int) {
	insertEntryQuery := `
  insert into note_game_entries (
    user_id,
    time_length,
    total_questions,
    correct_questions,
    notes_per_minute,
    created_date,
    created_time
  )
  values (
    :user_id,
    :time_length,
    :total_questions,
    :correct_questions,
    :notes_per_minute,
    :created_date,
    :created_time
  )
  returning
    id
  `

	// Generate a progress profile for this student
	profile := generateStudentProgressProfile()

	// Generate all entries with realistic progression
	entries := generateRealisticNoteGameEntries(studentID, entryCount, profile)

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

		result, err := database.DBClient.NamedExec(insertEntryQuery, entry)
		if err != nil {
			log.Printf(
				"Warning: failed to insert entry for student %d: %v, \n Sql result: %v. Skipping entry.",
				studentID, err, result,
			)
			continue
		}
	}
}

// Adds fake schools to the data base
func insertFakeSchools() string {
	insertSchoolQuery := `
  insert into schools (
    title,
    city,
    county,
    state,
    country,
    created_time,
    created_date
  )
  values (
    :title,
    :city,
    :county,
    :state,
    :country,
    :created_time,
    :created_date
  )
  returning
    id
  `
	for range 1000 {
		fakeSchool := generateFakeSchool()
		result, err := database.DBClient.NamedExec(insertSchoolQuery, fakeSchool)
		if err != nil {
			log.Panicf(
				"an error ocurred inserting the school to the database. Error: %v, \n Sql result: %v",
				err.Error(), result,
			)
		}
	}
	return "school inserted successfully"
}

// insertFakeTeacherWithStudents creates one teacher with a specified number of students
func insertFakeTeacherWithStudents(studentsPerTeacher int) dtos.User {
	insertUserQuery := `
  insert into users (
    first_name,
    last_name,
    school_id,
    role,
    email,
    password
  )
  values (
    :first_name,
    :last_name,
    :school_id,
    :role,
    :email,
    :password
  )
  returning
    id
  `

	schoolID := int16(rand.IntN(1000))
	teacher := generateFakeUser("TEACHER", schoolID)

	rows, err := database.DBClient.NamedQuery(insertUserQuery, teacher)
	if err != nil {
		log.Panic("teacher was not added to the db", err.Error())
	}

	var teacherID int
	if rows.Next() {
		err := rows.Scan(&teacherID)
		if err != nil {
			log.Panic("teacher id was not extracted properly", err.Error())
		}
	}

	for i := 0; i < studentsPerTeacher; i++ {
		student := generateFakeUser("STUDENT", schoolID)
		rows, err := database.DBClient.NamedQuery(insertUserQuery, student)
		if err != nil {
			log.Panic("student was not added to the db", err.Error())
		}

		var studentID int
		if rows.Next() {
			err := rows.Scan(&studentID)
			if err != nil {
				log.Panic("student id was not extracted properly", err.Error())
			}
		}

		// Generate realistic entries with progression (20-100 entries per student)
		entryCount := 20 + rand.IntN(81)
		insertRealisticEntries(int16(studentID), entryCount)
		if (i+1)%5 == 0 || i == studentsPerTeacher-1 {
			log.Printf("   Progress: %d/%d students created (last student: %d entries)",
				i+1, studentsPerTeacher, entryCount)
		}

		associationQuery := `
      insert into teacher_student (
        teacher_id,
        student_id
      )
      values (
        :teacher_id,
        :student_id
      )
    `
		associationIds := fakeTeacherToStudent{
			TeacherID: teacherID,
			StudentID: studentID,
		}

		result, err := database.DBClient.NamedExec(associationQuery, associationIds)
		if err != nil {
			log.Panic("association from teacher to student was not added to db", err.Error())
		}
		fmt.Println(result.RowsAffected())
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
		log.Printf("✓ Teacher %d: %s %s (ID assigned)", i+1, teacher.FirstName, teacher.LastName)
	}

	totalUsers := teacherCount + (teacherCount * studentsPerTeacher)
	log.Printf("\n✅ Data generation complete!")
	log.Printf("   Created: %d teachers", teacherCount)
	log.Printf("   Created: %d students", teacherCount*studentsPerTeacher)
	log.Printf("   Total users: %d", totalUsers)

	return fmt.Sprintf("Successfully created %d teachers with %d students each", teacherCount, studentsPerTeacher)
}
