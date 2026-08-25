package tests

import (
	"context"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
)

func TestChangePasswordRequestValid(t *testing.T) {
	t.Parallel()

	testCases := map[string]struct {
		req  dtos.ChangePasswordRequest
		key  string
		want string
	}{
		"empty current password": {
			req:  dtos.ChangePasswordRequest{CurrentPassword: "", NewPassword: "New-Passw0rd!"},
			key:  "current_password",
			want: "Current password is required",
		},
		"empty new password": {
			req:  dtos.ChangePasswordRequest{CurrentPassword: "Old-Passw0rd!", NewPassword: ""},
			key:  "new_password",
			want: "Password is required",
		},
		"short new password": {
			req:  dtos.ChangePasswordRequest{CurrentPassword: "Old-Passw0rd!", NewPassword: "short"},
			key:  "new_password",
			want: "Password must be at least 8 characters",
		},
		"weak new password": {
			req:  dtos.ChangePasswordRequest{CurrentPassword: "Old-Passw0rd!", NewPassword: "alllowercase"},
			key:  "new_password",
			want: "Password must contain at least 1 uppercase letter",
		},
		"new password same as current": {
			req:  dtos.ChangePasswordRequest{CurrentPassword: "Same-Passw0rd!", NewPassword: "Same-Passw0rd!"},
			key:  "new_password",
			want: "New password must differ from the current one",
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
		req := dtos.ChangePasswordRequest{
			CurrentPassword: "Old-Passw0rd!",
			NewPassword:     "New-Passw0rd!",
		}
		assert.Empty(t, req.Valid(context.Background()))
	})
}

func TestChangeEmailRequestValid(t *testing.T) {
	t.Parallel()

	testCases := map[string]struct {
		req  dtos.ChangeEmailRequest
		key  string
		want string
	}{
		"empty current password": {
			req:  dtos.ChangeEmailRequest{CurrentPassword: "", NewEmail: "new@example.com"},
			key:  "current_password",
			want: "Current password is required",
		},
		"empty new email": {
			req:  dtos.ChangeEmailRequest{CurrentPassword: "Old-Passw0rd!", NewEmail: ""},
			key:  "new_email",
			want: "Email is required",
		},
		"malformed new email": {
			req:  dtos.ChangeEmailRequest{CurrentPassword: "Old-Passw0rd!", NewEmail: "not-an-email"},
			key:  "new_email",
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
		req := dtos.ChangeEmailRequest{
			CurrentPassword: "Old-Passw0rd!",
			NewEmail:        "new@example.com",
		}
		assert.Empty(t, req.Valid(context.Background()))
	})
}

func TestConfirmEmailChangeRequestValid(t *testing.T) {
	t.Parallel()

	empty := dtos.ConfirmEmailChangeRequest{Token: ""}
	assert.Equal(t, "Token is required", empty.Valid(context.Background())["token"])

	good := dtos.ConfirmEmailChangeRequest{Token: "some-token"}
	assert.Empty(t, good.Valid(context.Background()))
}

// TestDeleteAccountRequestValid only requires the email confirmation:
// Password is validated by services.DeleteAccount, not here, because
// whether the account HAS a password to check is a database question a
// request DTO cannot answer on its own (see DeleteAccountRequest's doc
// comment). An empty Password must therefore never appear as a problem
// below.
func TestDeleteAccountRequestValid(t *testing.T) {
	t.Parallel()

	empty := dtos.DeleteAccountRequest{Password: "", EmailConfirmation: ""}
	problems := empty.Valid(context.Background())
	assert.Equal(t, "Email confirmation is required", problems["email_confirmation"])
	assert.NotContains(t, problems, "password")

	blankPassword := dtos.DeleteAccountRequest{Password: "", EmailConfirmation: "student@example.com"}
	assert.Empty(t, blankPassword.Valid(context.Background()), "a blank password is a valid shape -- it's the server's job to decide if it's enough")

	good := dtos.DeleteAccountRequest{Password: "Old-Passw0rd!", EmailConfirmation: "student@example.com"}
	assert.Empty(t, good.Valid(context.Background()))
}
