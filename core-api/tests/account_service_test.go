package tests

import (
	"context"
	"errors"
	"testing"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------- ChangePassword ----------

func TestChangePassword_Success(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "change_password_success")
	oldPassword := "Old-Passw0rd!"
	newPassword := "New-Passw0rd!"
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  oldPassword,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})

	err := services.ChangePassword(context.Background(), database.Queries, userID, dtos.ChangePasswordRequest{
		CurrentPassword: oldPassword,
		NewPassword:     newPassword,
	})
	require.NoError(t, err)

	_, err = services.Login(context.Background(), database.Queries, dtos.LoginRequest{Email: email, Password: newPassword})
	assert.NoError(t, err, "login with the new password should succeed")

	_, err = services.Login(context.Background(), database.Queries, dtos.LoginRequest{Email: email, Password: oldPassword})
	assert.Error(t, err, "login with the old password should fail")
	assert.True(t, errors.Is(err, services.ErrInvalidCredentials))
}

func TestChangePassword_WrongCurrentPassword(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "change_password_wrong_current")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	err := services.ChangePassword(context.Background(), database.Queries, userID, dtos.ChangePasswordRequest{
		CurrentPassword: "definitely-wrong",
		NewPassword:     "New-Passw0rd!",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrIncorrectPassword))
}

// TestChangePassword_GoogleOnlyAccount uses testutil.CreateTestOAuthUser
// (password_reset_service_test.go's Google-only fixture): no password to
// check the supplied "current password" against.
func TestChangePassword_GoogleOnlyAccount(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "change_password_google_only")
	userID := testutil.CreateTestOAuthUser(t, email)

	err := services.ChangePassword(context.Background(), database.Queries, userID, dtos.ChangePasswordRequest{
		CurrentPassword: "anything",
		NewPassword:     "New-Passw0rd!",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrNoPasswordSet))
}

func TestChangePassword_ClearsTheLockout(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "change_password_clears_lockout")
	oldPassword := "Old-Passw0rd!"
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  oldPassword,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	testutil.LockTestUserAccount(t, email, 15*time.Minute)

	err := services.ChangePassword(context.Background(), database.Queries, userID, dtos.ChangePasswordRequest{
		CurrentPassword: oldPassword,
		NewPassword:     "New-Passw0rd!",
	})
	require.NoError(t, err)

	_, err = services.Login(context.Background(), database.Queries, dtos.LoginRequest{
		Email:    email,
		Password: "New-Passw0rd!",
	})
	assert.NoError(t, err, "the account must not still be locked after a successful password change")
}

func TestChangePassword_InvalidatesOutstandingResetTokens(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "change_password_invalidates_reset")
	oldPassword := "Old-Passw0rd!"
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  oldPassword,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	resetToken := testutil.CreatePasswordResetToken(t, userID, services.PasswordResetTokenTTL)

	err := services.ChangePassword(context.Background(), database.Queries, userID, dtos.ChangePasswordRequest{
		CurrentPassword: oldPassword,
		NewPassword:     "New-Passw0rd!",
	})
	require.NoError(t, err)

	err = services.ResetPassword(context.Background(), database.Queries, dtos.ResetPasswordRequest{
		Token:    resetToken,
		Password: "AnotherPass789!",
	})
	require.Error(t, err, "a deliberate password change should have invalidated the outstanding reset token")
	assert.True(t, errors.Is(err, services.ErrResetTokenInvalid))
}
