package dtos

import "context"

// VerifyEmailRequest is the POST /api/auth/verify-email body. The mailed
// link points at the frontend, and the frontend page POSTs the token here
// -- see the controller's doc comment for why this is a POST, not the GET
// a link would normally be.
type VerifyEmailRequest struct {
	Token string `json:"token"`
}

func (req VerifyEmailRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if req.Token == "" {
		problems["token"] = "Token is required"
	}

	return problems
}

// VerifyEmailResponse is the POST /api/auth/verify-email body.
type VerifyEmailResponse struct {
	Message string `json:"message"`
}
