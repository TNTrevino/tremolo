package dtos

import (
	"context"
	"time"

	"sight-reading/validations"
)

// TeacherInviteCodeLength is the length of generated teacher invite codes.
const TeacherInviteCodeLength = 8

// CreateTeacherInviteRequest is an ADMIN's request to mint an invite code
// a teacher can sign up with. Both numbers treat 0 as "the default": a
// single use, and no expiry.
type CreateTeacherInviteRequest struct {
	Note          string `json:"note"`
	MaxUses       int    `json:"max_uses"`
	ExpiresInDays int    `json:"expires_in_days"`
}

func (r CreateTeacherInviteRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if r.MaxUses != 0 && (r.MaxUses < 1 || r.MaxUses > 100) {
		problems["max_uses"] = "MaxUses: must be between 1 and 100"
	}

	if r.ExpiresInDays != 0 && (r.ExpiresInDays < 1 || r.ExpiresInDays > 365) {
		problems["expires_in_days"] = "ExpiresInDays: must be between 1 and 365"
	}

	if !validations.VarChar255Length(r.Note) {
		problems["note"] = "Note: too long"
	}

	return problems
}

// TeacherInviteResponse is the admin's view of a minted code. There is no
// id: every route addresses a code by the code itself, and the row id is
// an implementation detail of the redeem/release pair.
type TeacherInviteResponse struct {
	Code      string     `json:"code"`
	Note      string     `json:"note"`
	MaxUses   int        `json:"max_uses"`
	UseCount  int        `json:"use_count"`
	ExpiresAt *time.Time `json:"expires_at"`
	CreatedAt time.Time  `json:"created_at"`
}
