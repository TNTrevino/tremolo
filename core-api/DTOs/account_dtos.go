package dtos

import (
	"context"
	"strings"
)

// ChangePasswordRequest is the PUT /api/users/{userId}/password body.
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

func (req ChangePasswordRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if req.CurrentPassword == "" {
		problems["current_password"] = "Current password is required"
	}

	switch msg := passwordProblem(req.NewPassword); {
	case msg != "":
		problems["new_password"] = msg
	case req.NewPassword == req.CurrentPassword:
		// Only reachable once NewPassword has already cleared the
		// complexity rule above, so CurrentPassword being empty (its own
		// separate problem) can never trigger this case: an empty
		// NewPassword would have failed passwordProblem first.
		problems["new_password"] = "New password must differ from the current one"
	}

	return problems
}

// ChangePasswordResponse is the PUT /api/users/{userId}/password body.
type ChangePasswordResponse struct {
	Message string `json:"message"`
}

// ChangeEmailRequest is the POST /api/users/{userId}/email body -- the
// authenticated account asking to move to NewEmail, re-proving
// CurrentPassword the same way a sensitive change always does here.
type ChangeEmailRequest struct {
	CurrentPassword string `json:"current_password"`
	NewEmail        string `json:"new_email"`
}

func (req ChangeEmailRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if req.CurrentPassword == "" {
		problems["current_password"] = "Current password is required"
	}

	if msg := emailProblem(req.NewEmail); msg != "" {
		problems["new_email"] = msg
	}

	return problems
}

// ChangeEmailResponse is the POST /api/users/{userId}/email body.
type ChangeEmailResponse struct {
	Message string `json:"message"`
}

// ConfirmEmailChangeRequest is the POST /api/auth/confirm-email-change
// body -- unauthenticated, like VerifyEmailRequest: the token itself is
// the credential.
type ConfirmEmailChangeRequest struct {
	Token string `json:"token"`
}

func (req ConfirmEmailChangeRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if strings.TrimSpace(req.Token) == "" {
		problems["token"] = "Token is required"
	}

	return problems
}

// ConfirmEmailChangeResponse is the POST /api/auth/confirm-email-change
// body. Email rides along so the frontend can show the new address (and
// refresh its stored user) without a second round trip.
type ConfirmEmailChangeResponse struct {
	Message string `json:"message"`
	Email   string `json:"email"`
}
