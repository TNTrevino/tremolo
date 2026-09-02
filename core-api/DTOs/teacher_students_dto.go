package dtos

type TeacherStudents struct {
	FirstName string `db:"first_name" json:"first_name"`
	LastName  string `db:"last_name"  json:"last_name"`
	Students  []User `                json:"students"`
}
