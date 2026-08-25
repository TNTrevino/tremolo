package tests

import (
	"context"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
)

func TestForgotPasswordRequestValid(t *testing.T) {
	t.Parallel()

	testCases := map[string]struct {
		req  dtos.ForgotPasswordRequest
		key  string
		want string
	}{
		"empty": {
			req:  dtos.ForgotPasswordRequest{Email: ""},
			key:  "email",
			want: "Email is required",
		},
		"malformed": {
			req:  dtos.ForgotPasswordRequest{Email: "invalidemail"},
			key:  "email",
			want: "Email must be a valid email address",
		},
	}

	for name, tc := range testCases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			problems := tc.req.Valid(context.Background())
			assert.Contains(t, problems[tc.key], tc.want)
		})
	}

	t.Run("valid", func(t *testing.T) {
		t.Parallel()
		req := dtos.ForgotPasswordRequest{Email: "test@example.com"}
		assert.Empty(t, req.Valid(context.Background()))
	})
}

func TestResetPasswordRequestValid(t *testing.T) {
	t.Parallel()

	testCases := map[string]struct {
		req  dtos.ResetPasswordRequest
		key  string
		want string
	}{
		"empty token": {
			req:  dtos.ResetPasswordRequest{Token: "", Password: "TestPass123!"},
			key:  "token",
			want: "Token is required",
		},
		"empty password": {
			req:  dtos.ResetPasswordRequest{Token: "sometoken", Password: ""},
			key:  "password",
			want: "Password is required",
		},
		"short password": {
			req:  dtos.ResetPasswordRequest{Token: "sometoken", Password: "short"},
			key:  "password",
			want: "Password must be at least 8 characters",
		},
		"simple password": {
			req:  dtos.ResetPasswordRequest{Token: "sometoken", Password: "simplepassword"},
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

	t.Run("valid", func(t *testing.T) {
		t.Parallel()
		req := dtos.ResetPasswordRequest{Token: "sometoken", Password: "TestPass123!"}
		assert.Empty(t, req.Valid(context.Background()))
	})
}
