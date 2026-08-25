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
	GetRole() string
	GetSchoolID() sql.NullInt32
}

type usersByRoleRowAdapter struct {
	row generated.GetUsersByRoleRow
}

func (a usersByRoleRowAdapter) GetFirstName() string       { return a.row.FirstName }
func (a usersByRoleRowAdapter) GetLastName() string        { return a.row.LastName }
func (a usersByRoleRowAdapter) GetRole() string            { return a.row.Role }
func (a usersByRoleRowAdapter) GetSchoolID() sql.NullInt32 { return a.row.SchoolID }

type userByIDRowAdapter struct {
	row generated.GetUserByIDRow
}

func (a userByIDRowAdapter) GetFirstName() string       { return a.row.FirstName }
func (a userByIDRowAdapter) GetLastName() string        { return a.row.LastName }
func (a userByIDRowAdapter) GetRole() string            { return a.row.Role }
func (a userByIDRowAdapter) GetSchoolID() sql.NullInt32 { return a.row.SchoolID }

type userByRoleAndIDRowAdapter struct {
	row generated.GetUserByRoleAndIDRow
}

func (a userByRoleAndIDRowAdapter) GetFirstName() string       { return a.row.FirstName }
func (a userByRoleAndIDRowAdapter) GetLastName() string        { return a.row.LastName }
func (a userByRoleAndIDRowAdapter) GetRole() string            { return a.row.Role }
func (a userByRoleAndIDRowAdapter) GetSchoolID() sql.NullInt32 { return a.row.SchoolID }

// convertUserRowToDTO is the single source of truth for converting user rows to DTOs.
// It accepts any type that implements UserRowData interface.
func convertUserRowToDTO(user UserRowData) dtos.User {
	result := dtos.User{
		FirstName: user.GetFirstName(),
		LastName:  user.GetLastName(),
		Role:      dtos.Role(user.GetRole()),
	}

	schoolID := user.GetSchoolID()
	if schoolID.Valid {
		result.SchoolID = int16(schoolID.Int32)
	}

	return result
}

func convertGetUsersByRoleRowToDTO(user generated.GetUsersByRoleRow) dtos.User {
	return convertUserRowToDTO(usersByRoleRowAdapter{row: user})
}

func convertGetUsersByRoleRowsToDTO(users []generated.GetUsersByRoleRow) []dtos.User {
	result := make([]dtos.User, len(users))
	for i, user := range users {
		result[i] = convertGetUsersByRoleRowToDTO(user)
	}
	return result
}

func convertGetUserByIDRowToDTO(user generated.GetUserByIDRow) dtos.User {
	return convertUserRowToDTO(userByIDRowAdapter{row: user})
}

func convertGetUserByRoleAndIDRowToDTO(user generated.GetUserByRoleAndIDRow) dtos.User {
	return convertUserRowToDTO(userByRoleAndIDRowAdapter{row: user})
}

func convertGetUserByIDRowToUserResponse(user generated.GetUserByIDRow) dtos.UserResponse {
	return dtos.UserResponse{
		ID:        int(user.ID),
		Email:     user.Email.String,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      user.Role,
	}
}

// convertCreateUserRowToUserResponse converts a CreateUserRow to a UserResponse DTO.
// Note: CreateUserRow now returns role_id (int32) instead of the role name string.
// The caller must look up the role name separately or pass it in.
func convertCreateUserRowToUserResponse(user generated.CreateUserRow, roleName string) dtos.UserResponse {
	return dtos.UserResponse{
		ID:        int(user.ID),
		Email:     user.Email.String,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      roleName,
	}
}

func convertGetUserGeneralInfoRowToDTO(userInfo generated.GetUserGeneralInfoRow) dtos.GeneralUserInfoDTO {
	totalDuration := "00:00:00"
	if userInfo.TotalDuration != nil {
		if durStr, ok := userInfo.TotalDuration.(string); ok {
			totalDuration = durStr
		}
	}

	dto := dtos.GeneralUserInfo{
		FirstName:    userInfo.FirstName,
		LastName:     userInfo.LastName,
		Role:         userInfo.Role,
		TotalEntries: int(userInfo.TotalEntries),
	}
	dto.CreatedDate.String = userInfo.CreatedDate
	dto.CreatedDate.Valid = true
	dto.TotalDuration.String = totalDuration
	dto.TotalDuration.Valid = true

	return dto.ToDTO()
}

func convertGetUserByEmailRowToUserResponse(user generated.GetUserByEmailRow) dtos.UserResponse {
	return dtos.UserResponse{
		ID:        int(user.ID),
		Email:     user.Email.String,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      user.Role,
	}
}

func convertGetUserByGoogleIDRowToUserResponse(user generated.GetUserByGoogleIDRow) dtos.UserResponse {
	return dtos.UserResponse{
		ID:        int(user.ID),
		Email:     user.Email.String,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      user.Role,
		HasGoogle: user.GoogleID.Valid,
	}
}

func convertGetUserByEmailForOAuthRowToUserResponse(user generated.GetUserByEmailForOAuthRow) dtos.UserResponse {
	return dtos.UserResponse{
		ID:        int(user.ID),
		Email:     user.Email.String,
		FirstName: user.FirstName,
		LastName:  user.LastName,
		Role:      user.Role,
		HasGoogle: user.GoogleID.Valid,
	}
}
