package services

import (
	"database/sql"
	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
)

// UserRowData represents common user fields from various query results.
// This interface abstracts over various sqlc-generated row types.
type UserRowData interface {
	GetFirstName() string
	GetLastName() string
	GetRole() sql.NullString
	GetSchoolID() sql.NullInt32
}

// Adapter implementations (private structs that wrap sqlc-generated row types)

type usersByRoleRowAdapter struct {
	row generated.GetUsersByRoleRow
}

func (a usersByRoleRowAdapter) GetFirstName() string       { return a.row.FirstName }
func (a usersByRoleRowAdapter) GetLastName() string        { return a.row.LastName }
func (a usersByRoleRowAdapter) GetRole() sql.NullString    { return a.row.Role }
func (a usersByRoleRowAdapter) GetSchoolID() sql.NullInt32 { return a.row.SchoolID }

type userByIDRowAdapter struct {
	row generated.GetUserByIDRow
}

func (a userByIDRowAdapter) GetFirstName() string       { return a.row.FirstName }
func (a userByIDRowAdapter) GetLastName() string        { return a.row.LastName }
func (a userByIDRowAdapter) GetRole() sql.NullString    { return a.row.Role }
func (a userByIDRowAdapter) GetSchoolID() sql.NullInt32 { return a.row.SchoolID }

type createUserRowAdapter struct {
	row generated.CreateUserRow
}

func (a createUserRowAdapter) GetFirstName() string       { return a.row.FirstName }
func (a createUserRowAdapter) GetLastName() string        { return a.row.LastName }
func (a createUserRowAdapter) GetRole() sql.NullString    { return a.row.Role }
func (a createUserRowAdapter) GetSchoolID() sql.NullInt32 { return a.row.SchoolID }

type userByRoleAndIDRowAdapter struct {
	row generated.GetUserByRoleAndIDRow
}

func (a userByRoleAndIDRowAdapter) GetFirstName() string       { return a.row.FirstName }
func (a userByRoleAndIDRowAdapter) GetLastName() string        { return a.row.LastName }
func (a userByRoleAndIDRowAdapter) GetRole() sql.NullString    { return a.row.Role }
func (a userByRoleAndIDRowAdapter) GetSchoolID() sql.NullInt32 { return a.row.SchoolID }

// convertUserRowToDTO is the single source of truth for converting user rows to DTOs.
// It accepts any type that implements UserRowData interface.
func convertUserRowToDTO(user UserRowData) dtos.User {
	result := dtos.User{
		FirstName: user.GetFirstName(),
		LastName:  user.GetLastName(),
		Role:      dtos.Role(user.GetRole().String),
	}

	schoolID := user.GetSchoolID()
	if schoolID.Valid {
		result.SchoolID = int16(schoolID.Int32)
	}

	return result
}

// Type-specific wrapper functions for backward compatibility

// convertGetUsersByRoleRowToDTO converts a GetUsersByRoleRow to a User DTO
func convertGetUsersByRoleRowToDTO(user generated.GetUsersByRoleRow) dtos.User {
	return convertUserRowToDTO(usersByRoleRowAdapter{row: user})
}

// convertGetUsersByRoleRowsToDTO converts a slice of GetUsersByRoleRow to User DTOs
func convertGetUsersByRoleRowsToDTO(users []generated.GetUsersByRoleRow) []dtos.User {
	result := make([]dtos.User, len(users))
	for i, user := range users {
		result[i] = convertGetUsersByRoleRowToDTO(user)
	}
	return result
}

// convertGetUserByIDRowToDTO converts a GetUserByIDRow to a User DTO
func convertGetUserByIDRowToDTO(user generated.GetUserByIDRow) dtos.User {
	return convertUserRowToDTO(userByIDRowAdapter{row: user})
}

// convertCreateUserRowToDTO converts a CreateUserRow to a User DTO
func convertCreateUserRowToDTO(user generated.CreateUserRow) dtos.User {
	return convertUserRowToDTO(createUserRowAdapter{row: user})
}

// convertGetUserByRoleAndIDRowToDTO converts a GetUserByRoleAndIDRow to a User DTO
func convertGetUserByRoleAndIDRowToDTO(user generated.GetUserByRoleAndIDRow) dtos.User {
	return convertUserRowToDTO(userByRoleAndIDRowAdapter{row: user})
}
