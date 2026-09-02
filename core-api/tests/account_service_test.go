package tests

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"testing"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/database/generated"
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

// ---------- RequestEmailChange ----------

func TestRequestEmailChange_EnqueuesToTheNewAddressAndAlertsTheOld(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	oldEmail := testutil.UniqueEmail(t, "change_email_old")
	newEmail := testutil.UniqueEmail(t, "change_email_new")
	password := "Old-Passw0rd!"
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     oldEmail,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	t.Cleanup(func() { testutil.DeleteQueuedEmails(t, newEmail) })

	err := services.RequestEmailChange(context.Background(), database.Queries, userID, dtos.ChangeEmailRequest{
		CurrentPassword: password,
		NewEmail:        newEmail,
	})
	require.NoError(t, err)

	toNew := testutil.QueuedEmailsFor(t, newEmail)
	require.Len(t, toNew, 1, "expected exactly one email queued to the new address")
	assert.Equal(t, "email-change", toNew[0].Template)
	assert.Contains(t, toNew[0].BodyText, "/confirm-email-change?token=")

	toOld := testutil.QueuedEmailsFor(t, oldEmail)
	require.Len(t, toOld, 1, "expected exactly one alert queued to the old address")
	assert.Equal(t, "email-change-alert", toOld[0].Template)
	assert.NotContains(t, toOld[0].BodyText, "token=", "the alert to the old address carries no action link")

	tokens := testutil.EmailTokensFor(t, userID, services.PurposeChangeEmail)
	assert.Equal(t, 1, countUnused(tokens), "expected exactly one unused change-email token")
}

func TestRequestEmailChange_WrongCurrentPassword(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "change_email_wrong_current")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	err := services.RequestEmailChange(context.Background(), database.Queries, userID, dtos.ChangeEmailRequest{
		CurrentPassword: "definitely-wrong",
		NewEmail:        testutil.UniqueEmail(t, "change_email_wrong_current_new"),
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrIncorrectPassword))
}

func TestRequestEmailChange_AddressAlreadyInUse(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	password := "Old-Passw0rd!"
	requesterEmail := testutil.UniqueEmail(t, "change_email_taken_requester")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     requesterEmail,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	takenEmail := testutil.UniqueEmail(t, "change_email_taken_target")
	testutil.CreateTestUserWithDefaults(t, takenEmail, "STUDENT")

	err := services.RequestEmailChange(context.Background(), database.Queries, userID, dtos.ChangeEmailRequest{
		CurrentPassword: password,
		NewEmail:        takenEmail,
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrEmailTaken))
}

func TestRequestEmailChange_SameAddress(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	password := "Old-Passw0rd!"
	email := testutil.UniqueEmail(t, "change_email_same")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})

	// Uppercased, to prove the "same address" check normalizes before
	// comparing rather than only catching a byte-identical resubmission.
	err := services.RequestEmailChange(context.Background(), database.Queries, userID, dtos.ChangeEmailRequest{
		CurrentPassword: password,
		NewEmail:        strings.ToUpper(email),
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrValidation))
}

// TestRequestEmailChange_GoogleLinkedAccount links Google onto an account
// that also has a password (LinkGoogleAccount, not CreateTestOAuthUser --
// a Google-only account has no password and would fail the earlier
// ErrNoPasswordSet check first). The address is the Google identity
// either way, so there is nothing here for RequestEmailChange to move.
func TestRequestEmailChange_GoogleLinkedAccount(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	password := "Old-Passw0rd!"
	email := testutil.UniqueEmail(t, "change_email_google_linked")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	require.NoError(t, database.Queries.LinkGoogleAccount(context.Background(), generated.LinkGoogleAccountParams{
		GoogleID: sql.NullString{String: "test-google-" + email, Valid: true},
		ID:       int32(userID),
	}))

	err := services.RequestEmailChange(context.Background(), database.Queries, userID, dtos.ChangeEmailRequest{
		CurrentPassword: password,
		NewEmail:        testutil.UniqueEmail(t, "change_email_google_linked_new"),
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrEmailManagedByGoogle))
}

func TestRequestEmailChange_InvalidatesThePreviousPendingChange(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	password := "Old-Passw0rd!"
	email := testutil.UniqueEmail(t, "change_email_invalidate")
	firstTarget := testutil.UniqueEmail(t, "change_email_invalidate_first")
	secondTarget := testutil.UniqueEmail(t, "change_email_invalidate_second")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	t.Cleanup(func() {
		testutil.DeleteQueuedEmails(t, firstTarget)
		testutil.DeleteQueuedEmails(t, secondTarget)
	})

	require.NoError(t, services.RequestEmailChange(context.Background(), database.Queries, userID, dtos.ChangeEmailRequest{
		CurrentPassword: password,
		NewEmail:        firstTarget,
	}))
	first := testutil.LatestQueuedEmail(t, firstTarget)
	require.NotNil(t, first)
	firstToken := resetTokenPattern.FindStringSubmatch(first.BodyText)[1]

	require.NoError(t, services.RequestEmailChange(context.Background(), database.Queries, userID, dtos.ChangeEmailRequest{
		CurrentPassword: password,
		NewEmail:        secondTarget,
	}))

	// The first token, never itself consumed, must now be unusable --
	// same "only the newest link works" guarantee RequestPasswordReset
	// and SendVerificationEmail give.
	_, err := services.ConfirmEmailChange(context.Background(), database.Queries, dtos.ConfirmEmailChangeRequest{Token: firstToken})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrEmailTokenInvalid))

	tokens := testutil.EmailTokensFor(t, userID, services.PurposeChangeEmail)
	require.Len(t, tokens, 2)
	assert.Equal(t, 1, countUnused(tokens), "only the newest (second) token should remain unused")
}

// ---------- ConfirmEmailChange ----------

// TestConfirmEmailChange_EndToEnd_TheEmailedLinkWorks is the headline
// case: a real request, pulling the token out of the queued mail body
// exactly as a user's browser would after clicking the link, and a real
// confirmation. Login with the new address and the (unchanged) old
// password is what proves this is the same account, not a new one.
func TestConfirmEmailChange_EndToEnd_TheEmailedLinkWorks(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	oldEmail := testutil.UniqueEmail(t, "confirm_email_e2e_old")
	newEmail := testutil.UniqueEmail(t, "confirm_email_e2e_new")
	password := "Old-Passw0rd!"
	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     oldEmail,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	t.Cleanup(func() { testutil.DeleteQueuedEmails(t, newEmail) })

	userID := func() int {
		u := testutil.GetTestUserByEmail(t, oldEmail)
		require.NotNil(t, u)
		return int(u.ID)
	}()
	require.NoError(t, services.RequestEmailChange(context.Background(), database.Queries, userID, dtos.ChangeEmailRequest{
		CurrentPassword: password,
		NewEmail:        newEmail,
	}))

	queued := testutil.LatestQueuedEmail(t, newEmail)
	require.NotNil(t, queued)
	match := resetTokenPattern.FindStringSubmatch(queued.BodyText)
	require.Len(t, match, 2, "expected a confirm token in the queued email body: %s", queued.BodyText)
	token := match[1]

	res, err := services.ConfirmEmailChange(context.Background(), database.Queries, dtos.ConfirmEmailChangeRequest{Token: token})
	require.NoError(t, err)
	assert.Equal(t, newEmail, res.Email)

	user := testutil.GetTestUserByEmail(t, newEmail)
	require.NotNil(t, user, "the user row must now be reachable by the new address")
	assert.True(t, user.EmailVerifiedAt.Valid, "confirming the link itself proves control of the new address")

	_, err = services.Login(context.Background(), database.Queries, dtos.LoginRequest{Email: newEmail, Password: password})
	assert.NoError(t, err, "the old password still works against the account at its new address")
}

func TestConfirmEmailChange_TokenIsSingleUse(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "confirm_email_single_use")
	newEmail := testutil.UniqueEmail(t, "confirm_email_single_use_new")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	t.Cleanup(func() { testutil.DeleteQueuedEmails(t, newEmail) })
	token := testutil.CreateEmailToken(t, userID, services.PurposeChangeEmail, newEmail, services.ChangeEmailTokenTTL)

	_, err := services.ConfirmEmailChange(context.Background(), database.Queries, dtos.ConfirmEmailChangeRequest{Token: token})
	require.NoError(t, err)

	_, err = services.ConfirmEmailChange(context.Background(), database.Queries, dtos.ConfirmEmailChangeRequest{Token: token})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrEmailTokenInvalid))
}

func TestConfirmEmailChange_ExpiredToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "confirm_email_expired")
	newEmail := testutil.UniqueEmail(t, "confirm_email_expired_new")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testutil.CreateEmailToken(t, userID, services.PurposeChangeEmail, newEmail, -time.Hour)

	_, err := services.ConfirmEmailChange(context.Background(), database.Queries, dtos.ConfirmEmailChangeRequest{Token: token})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrEmailTokenInvalid))
}

// TestConfirmEmailChange_CollisionAtConfirmTime simulates the address
// being claimed by someone else in the window between request and
// confirm: RequestEmailChange's own check cannot see that race, so the
// database's unique index is what ConfirmEmailChange actually leans on.
func TestConfirmEmailChange_CollisionAtConfirmTime(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	password := "Old-Passw0rd!"
	email := testutil.UniqueEmail(t, "confirm_email_collision")
	contestedEmail := testutil.UniqueEmail(t, "confirm_email_collision_target")
	userID := testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  password,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})
	t.Cleanup(func() { testutil.DeleteQueuedEmails(t, contestedEmail) })

	require.NoError(t, services.RequestEmailChange(context.Background(), database.Queries, userID, dtos.ChangeEmailRequest{
		CurrentPassword: password,
		NewEmail:        contestedEmail,
	}))
	queued := testutil.LatestQueuedEmail(t, contestedEmail)
	require.NotNil(t, queued)
	token := resetTokenPattern.FindStringSubmatch(queued.BodyText)[1]

	// Someone else claims the contested address before the link is used.
	testutil.CreateTestUserWithDefaults(t, contestedEmail, "STUDENT")

	_, err := services.ConfirmEmailChange(context.Background(), database.Queries, dtos.ConfirmEmailChangeRequest{Token: token})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrEmailTaken))
}
