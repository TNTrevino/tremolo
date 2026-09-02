package dtos

import (
	"context"
	"strings"
	"time"
)

// JoinCodeLength is the length of generated class join codes.
const JoinCodeLength = 6

type CreateClassRequest struct {
	Name string `json:"name"`
}

func (r CreateClassRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	name := strings.TrimSpace(r.Name)
	switch {
	case name == "":
		problems["name"] = "Name: is required"
	case len(name) > 255:
		problems["name"] = "Name: too long"
	}

	return problems
}

type JoinClassRequest struct {
	JoinCode string `json:"join_code"`
}

func (r JoinClassRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if strings.TrimSpace(r.JoinCode) == "" {
		problems["join_code"] = "JoinCode: is required"
	}

	return problems
}

// ClassResponse is the teacher's view of a class they own.
type ClassResponse struct {
	ID           int       `json:"id"`
	Name         string    `json:"name"`
	JoinCode     string    `json:"join_code"`
	StudentCount int       `json:"student_count"`
	CreatedAt    time.Time `json:"created_at"`
}

// StudentClassResponse is the student's view of a class they belong to.
// The join code is deliberately absent: students shouldn't redistribute it.
type StudentClassResponse struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	TeacherName string `json:"teacher_name"`
}

type RosterEntryResponse struct {
	StudentID int       `json:"student_id"`
	FirstName string    `json:"first_name"`
	LastName  string    `json:"last_name"`
	JoinedAt  time.Time `json:"joined_at"`
}
