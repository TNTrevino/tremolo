package tests

import (
	"context"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
)

func TestLoginRequestValid_AcceptsGoodCredentials(t *testing.T) {
	t.Parallel()

	req := dtos.LoginRequest{Email: "test@example.com", Password: "TestPass123!"}

	assert.Empty(t, req.Valid(context.Background()))
}

func TestLoginRequestValid_RejectsBadCredentials(t *testing.T) {
	t.Parallel()

	testCases := map[string]struct {
		req  dtos.LoginRequest
		key  string
		want string
	}{
		"empty email": {
			req:  dtos.LoginRequest{Email: "", Password: "TestPass123!"},
			key:  "email",
			want: "Email is required",
		},
		"malformed email": {
			req:  dtos.LoginRequest{Email: "invalidemail", Password: "TestPass123!"},
			key:  "email",
			want: "Email must be a valid email address",
		},
		"empty password": {
			req:  dtos.LoginRequest{Email: "test@example.com", Password: ""},
			key:  "password",
			want: "Password is required",
		},
		"short password": {
			req:  dtos.LoginRequest{Email: "test@example.com", Password: "short"},
			key:  "password",
			want: "Password must be at least 8 characters",
		},
		"simple password": {
			req:  dtos.LoginRequest{Email: "test@example.com", Password: "simplepassword"},
			key:  "password",
			want: "Password must contain at least 1 uppercase letter",
		},
	}

	for name, tc := range testCases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			problems := tc.req.Valid(context.Background())
			assert.Contains(t, problems[tc.key], tc.want)
		})
	}
}

func validRegisterRequest() dtos.RegisterRequest {
	return dtos.RegisterRequest{
		Email:     "test@example.com",
		Password:  "TestPass123!",
		FirstName: "John",
		LastName:  "Doe",
		Role:      "STUDENT",
	}
}

func TestRegisterRequestValid_AcceptsAGoodRequest(t *testing.T) {
	t.Parallel()

	assert.Empty(t, validRegisterRequest().Valid(context.Background()))
}

func TestRegisterRequestValid_RejectsBadFields(t *testing.T) {
	t.Parallel()

	testCases := map[string]struct {
		mutate func(*dtos.RegisterRequest)
		key    string
		want   string
	}{
		"empty email":    {func(r *dtos.RegisterRequest) { r.Email = "" }, "email", "Email is required"},
		"short first":    {func(r *dtos.RegisterRequest) { r.FirstName = "J" }, "first_name", "First name must be at least 2 characters"},
		"empty first":    {func(r *dtos.RegisterRequest) { r.FirstName = "" }, "first_name", "First name is required"},
		"short last":     {func(r *dtos.RegisterRequest) { r.LastName = "D" }, "last_name", "Last name must be at least 2 characters"},
		"empty role":     {func(r *dtos.RegisterRequest) { r.Role = "" }, "role", "Role is required"},
		"unknown role":   {func(r *dtos.RegisterRequest) { r.Role = "ADMIN" }, "role", "Role must be one of: STUDENT, TEACHER, PARENT"},
		"short password": {func(r *dtos.RegisterRequest) { r.Password = "Aa1!" }, "password", "Password must be at least 8 characters"},
	}

	for name, tc := range testCases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			req := validRegisterRequest()
			tc.mutate(&req)

			problems := req.Valid(context.Background())

			assert.Contains(t, problems[tc.key], tc.want)
		})
	}
}

func TestGoogleCallbackRequestValid(t *testing.T) {
	t.Parallel()

	good := dtos.GoogleCallbackRequest{
		Code:        "auth-code",
		RedirectURI: "https://tremolonotes.com/auth/callback",
	}
	assert.Empty(t, good.Valid(context.Background()))

	noCode := good
	noCode.Code = ""
	assert.Equal(t, "Authorization code is required", noCode.Valid(context.Background())["code"])

	noURI := good
	noURI.RedirectURI = ""
	assert.Equal(t, "Redirect URI is required", noURI.Valid(context.Background())["redirect_uri"])

	badURI := good
	badURI.RedirectURI = "not-a-url"
	assert.Equal(t, "Redirect URI must be a valid URL", badURI.Valid(context.Background())["redirect_uri"])
}
