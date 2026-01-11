package services

import (
	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
)

// convertGetUsersByRoleRowToDTO converts a GetUsersByRoleRow to a User DTO
func convertGetUsersByRoleRowToDTO(user generated.GetUsersByRoleRow) dtos.User {
	result := dtos.User{
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      dtos.Role(user.Role.String),
	}
	if user.SchoolID.Valid {
		result.SchoolID = int16(user.SchoolID.Int32)
	}
	return result
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
	result := dtos.User{
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      dtos.Role(user.Role.String),
	}
	if user.SchoolID.Valid {
		result.SchoolID = int16(user.SchoolID.Int32)
	}
	return result
}

// convertCreateUserRowToDTO converts a CreateUserRow to a User DTO
func convertCreateUserRowToDTO(user generated.CreateUserRow) dtos.User {
	result := dtos.User{
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      dtos.Role(user.Role.String),
	}
	if user.SchoolID.Valid {
		result.SchoolID = int16(user.SchoolID.Int32)
	}
	return result
}

// convertGetUserByRoleAndIDRowToDTO converts a GetUserByRoleAndIDRow to a User DTO
func convertGetUserByRoleAndIDRowToDTO(user generated.GetUserByRoleAndIDRow) dtos.User {
	result := dtos.User{
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      dtos.Role(user.Role.String),
	}
	if user.SchoolID.Valid {
		result.SchoolID = int16(user.SchoolID.Int32)
	}
	return result
}
