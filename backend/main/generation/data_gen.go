// Package generation contains the scripting to generate mock data for our local database
package generation

import (
	"fmt"
	"strings"
)

func GenerateData() {
	initFaker()

	println(strings.Repeat("------------------------------", 2))
	println("\nGenerating data...\n")
	println(strings.Repeat("------------------------------", 2))

	// Generate schools
	fmt.Println(insertFakeSchools())

	// Generate teachers with students
	// 20 teachers, each with 20 students
	fmt.Println(insertMultipleTeachersWithStudents(20, 20))
}
