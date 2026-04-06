// Package generation contains the scripting to generate mock data for our local database
package generation

import (
	"fmt"
	"log"
	"math/rand/v2"
	"strings"
)

func GenerateData() {
	initFaker()

	log.Println(strings.Repeat("------------------------------", 2))
	log.Println("Generating data...")
	log.Println(strings.Repeat("------------------------------", 2))

	fmt.Println(insertFakeSchools())

	// 20 teachers, each with 20 students
	teacherIDs, studentIDs := insertMultipleTeachersWithStudents(20, 20)
	fmt.Printf("Created %d total users\n", len(teacherIDs)+len(studentIDs))

	// If TREMOLO_ env vars are set, create a personal user and wire up friends + students
	schoolID := int16(rand.IntN(1000) + 1)
	personalUserID := insertPersonalUser(schoolID)
	if personalUserID != 0 {
		insertFriendsForUser(personalUserID, teacherIDs, 10)
		assignStudentsToUser(personalUserID, studentIDs, 20)
	}
}
