package dtos

import (
	"errors"
	"strings"
	"time"
)

// JoinCodeLength is the length of generated class join codes.
const JoinCodeLength = 6

type CreateClassRequest struct {
	Name string `json:"name"`
}

func (r *CreateClassRequest) Validate() error {
	var errorMessages []string

	name := strings.TrimSpace(r.Name)
	if name == "" {
		errorMessages = append(errorMessages, "Name: is required")
	} else if len(name) > 255 {
		errorMessages = append(errorMessages, "Name: too long")
	}

	if len(errorMessages) > 0 {
		return errors.New(strings.Join(errorMessages, ",\n"))
	}
	return nil
}

type JoinClassRequest struct {
	JoinCode string `json:"join_code"`
}

func (r *JoinClassRequest) Validate() error {
	if strings.TrimSpace(r.JoinCode) == "" {
		return errors.New("JoinCode: is required")
	}
	return nil
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
