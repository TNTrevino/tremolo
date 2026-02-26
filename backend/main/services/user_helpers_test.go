package services

import (
	"database/sql"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"

	"github.com/stretchr/testify/assert"
)

func TestConvertUserRowToDTO_WithSchoolID(t *testing.T) {
	row := generated.GetUsersByRoleRow{
		FirstName: "John",
		LastName:  "Doe",
		Role:      "STUDENT",
		SchoolID:  sql.NullInt32{Int32: 42, Valid: true},
	}

	result := convertGetUsersByRoleRowToDTO(row)

	assert.Equal(t, "John", result.FirstName)
	assert.Equal(t, "Doe", result.LastName)
	assert.Equal(t, dtos.Role("STUDENT"), result.Role)
	assert.Equal(t, int16(42), result.SchoolID)
}

func TestConvertUserRowToDTO_WithoutSchoolID(t *testing.T) {
	row := generated.GetUserByIDRow{
		FirstName: "Jane",
		LastName:  "Smith",
		Role:      "TEACHER",
		SchoolID:  sql.NullInt32{Valid: false},
	}

	result := convertGetUserByIDRowToDTO(row)

	assert.Equal(t, "Jane", result.FirstName)
	assert.Equal(t, "Smith", result.LastName)
	assert.Equal(t, dtos.Role("TEACHER"), result.Role)
	assert.Equal(t, int16(0), result.SchoolID)
}

func TestConvertGetUserByRoleAndIDRowToDTO(t *testing.T) {
	row := generated.GetUserByRoleAndIDRow{
		FirstName: "Bob",
		LastName:  "Wilson",
		Role:      "ADMIN",
		SchoolID:  sql.NullInt32{Valid: false},
	}

	result := convertGetUserByRoleAndIDRowToDTO(row)

	assert.Equal(t, "Bob", result.FirstName)
	assert.Equal(t, "Wilson", result.LastName)
	assert.Equal(t, dtos.Role("ADMIN"), result.Role)
	assert.Equal(t, int16(0), result.SchoolID)
}

func TestConvertGetUsersByRoleRowsToDTO(t *testing.T) {
	rows := []generated.GetUsersByRoleRow{
		{
			FirstName: "User1",
			LastName:  "LastName1",
			Role:      "STUDENT",
			SchoolID:  sql.NullInt32{Int32: 1, Valid: true},
		},
		{
			FirstName: "User2",
			LastName:  "LastName2",
			Role:      "STUDENT",
			SchoolID:  sql.NullInt32{Int32: 2, Valid: true},
		},
		{
			FirstName: "User3",
			LastName:  "LastName3",
			Role:      "STUDENT",
			SchoolID:  sql.NullInt32{Valid: false},
		},
	}

	result := convertGetUsersByRoleRowsToDTO(rows)

	assert.Len(t, result, 3)
	assert.Equal(t, "User1", result[0].FirstName)
	assert.Equal(t, int16(1), result[0].SchoolID)
	assert.Equal(t, "User2", result[1].FirstName)
	assert.Equal(t, int16(2), result[1].SchoolID)
	assert.Equal(t, "User3", result[2].FirstName)
	assert.Equal(t, int16(0), result[2].SchoolID)
}

func TestConvertUserRowToDTO_EmptyRole(t *testing.T) {
	row := generated.GetUsersByRoleRow{
		FirstName: "NoRole",
		LastName:  "User",
		Role:      "",
		SchoolID:  sql.NullInt32{Int32: 50, Valid: true},
	}

	result := convertGetUsersByRoleRowToDTO(row)

	assert.Equal(t, "NoRole", result.FirstName)
	assert.Equal(t, "User", result.LastName)
	assert.Equal(t, dtos.Role(""), result.Role)
	assert.Equal(t, int16(50), result.SchoolID)
}
