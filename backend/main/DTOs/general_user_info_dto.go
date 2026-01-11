package dtos

import (
	"database/sql"
	"time"
)

// GeneralUserInfo represents basic user information and aggregate statistics
// Used for displaying user profile summary on the dashboard
type GeneralUserInfo struct {
	FirstName     string         `db:"first_name" json:"first_name"`
	LastName      string         `db:"last_name" json:"last_name"`
	CreatedDate   sql.NullString `db:"created_date" json:"-"`
	TotalEntries  int            `db:"total_entries" json:"total_entries"`
	TotalDuration sql.NullString `db:"total_duration" json:"-"`
}

// GeneralUserInfoDTO is the response DTO with formatted fields for the frontend
type GeneralUserInfoDTO struct {
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
	CreatedDate   string `json:"created_date"` // Format: "Joined 12 Mar 2024"
	TotalEntries  int    `json:"total_entries"`
	TotalDuration string `json:"total_duration"` // Format: "HH:MM:SS" or human-readable
}

// ToDTO converts the database model to the response DTO with formatted fields
func (u *GeneralUserInfo) ToDTO() GeneralUserInfoDTO {
	dto := GeneralUserInfoDTO{
		FirstName:     u.FirstName,
		LastName:      u.LastName,
		TotalEntries:  u.TotalEntries,
		CreatedDate:   "Joined N/A",
		TotalDuration: "00:00:00",
	}

	// Format created date as "Joined 12 Mar 2024"
	if u.CreatedDate.Valid {
		parsedDate, err := time.Parse("2006-01-02", u.CreatedDate.String)
		if err == nil {
			dto.CreatedDate = "Joined " + parsedDate.Format("02 Jan 2006")
		}
	}

	// Format total duration as "HH:MM:SS"
	if u.TotalDuration.Valid {
		dto.TotalDuration = u.TotalDuration.String
	}

	return dto
}
