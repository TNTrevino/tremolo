package dtos

import (
	"context"

	"sight-reading/validations"
)

// ForgotPasswordRequest is the POST /api/auth/forgot-password body.
type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

func (req ForgotPasswordRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	switch {
	case req.Email == "":
		problems["email"] = "Email is required"
	case !validations.IsEmail(req.Email):
		problems["email"] = "Email must be a valid email address"
	}

	return problems
}

// ForgotPasswordResponse is the POST /api/auth/forgot-password body. The
// message is byte-identical whether or not the address has an account --
// see services.RequestPasswordReset's doc comment.
type ForgotPasswordResponse struct {
	Message string `json:"message"`
}

// ResetPasswordRequest is the POST /api/auth/reset-password body.
type ResetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

func (req ResetPasswordRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if req.Token == "" {
		problems["token"] = "Token is required"
	}

	return addPasswordProblem(problems, req.Password)
}

// ResetPasswordResponse is the POST /api/auth/reset-password body.
type ResetPasswordResponse struct {
	Message string `json:"message"`
}
