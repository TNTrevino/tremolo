package tests

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"testing"
	"time"

	dtos "sight-reading/DTOs"
	"sight-reading/database"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// resetTokenPattern pulls the plaintext token back out of a queued mail's
// body -- the only place it ever exists outside the request that minted
// it, since only its sha256 hash is stored.
var resetTokenPattern = regexp.MustCompile(`token=([A-Za-z0-9_\-]+)`)

// ---------- RequestPasswordReset ----------

func TestRequestPasswordReset_KnownAccount_EnqueuesAResetLink(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "reset_known")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	err := services.RequestPasswordReset(context.Background(), database.Queries, dtos.ForgotPasswordRequest{Email: email})
	require.NoError(t, err)

	queued := testutil.QueuedEmailsFor(t, email)
	require.Len(t, queued, 1, "expected exactly one queued email")
	assert.Equal(t, "password-reset", queued[0].Template)
	assert.Contains(t, queued[0].BodyText, "/reset-password?token=")

	tokens := testutil.PasswordResetTokensFor(t, userID)
	unused := 0
	for _, tok := range tokens {
		if !tok.UsedAt.Valid {
			unused++
		}
	}
	assert.Equal(t, 1, unused, "expected exactly one unused token row")
}

func TestRequestPasswordReset_UnknownAccount_EnqueuesNothing(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "reset_unknown")

	err := services.RequestPasswordReset(context.Background(), database.Queries, dtos.ForgotPasswordRequest{Email: email})
	require.NoError(t, err)

	assert.Empty(t, testutil.QueuedEmailsFor(t, email))
}

func TestRequestPasswordReset_GoogleOnlyAccount_EnqueuesTheGoogleNotice(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "reset_google")
	testutil.CreateTestOAuthUser(t, email)

	err := services.RequestPasswordReset(context.Background(), database.Queries, dtos.ForgotPasswordRequest{Email: email})
	require.NoError(t, err)

	queued := testutil.QueuedEmailsFor(t, email)
	require.Len(t, queued, 1)
	assert.Equal(t, "password-reset-google", queued[0].Template)
	assert.NotContains(t, queued[0].BodyText, "token=")
}

func TestRequestPasswordReset_NormalizesTheEmail(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "reset_normalize")
	testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	err := services.RequestPasswordReset(context.Background(), database.Queries, dtos.ForgotPasswordRequest{
		Email: strings.ToUpper(email),
	})
	require.NoError(t, err)

	assert.Len(t, testutil.QueuedEmailsFor(t, email), 1)
}

func TestRequestPasswordReset_GoogleAccountIssuesNoToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "reset_google_no_token")
	userID := testutil.CreateTestOAuthUser(t, email)

	require.NoError(t, services.RequestPasswordReset(context.Background(), database.Queries, dtos.ForgotPasswordRequest{Email: email}))

	assert.Empty(t, testutil.PasswordResetTokensFor(t, userID))
}

// ---------- ResetPassword ----------

// TestResetPassword_EndToEnd_TheEmailedLinkWorks is the headline case: a
// real request, pulling the token out of the queued mail body exactly as
// a user's browser would after clicking the link, and a real reset. The
// token is never handled directly -- only its hash is ever stored -- so
// this is the only test that proves the whole loop closes.
func TestResetPassword_EndToEnd_TheEmailedLinkWorks(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "reset_e2e")
	oldPassword := "TestPass123!"
	newPassword := "NewTestPass456!"
	testutil.CreateTestUser(t, testutil.CreateTestUserParams{
		Email:     email,
		Password:  oldPassword,
		FirstName: "Test",
		LastName:  "User",
		Role:      "STUDENT",
	})

	require.NoError(t, services.RequestPasswordReset(context.Background(), database.Queries, dtos.ForgotPasswordRequest{Email: email}))

	queued := testutil.LatestQueuedEmail(t, email)
	require.NotNil(t, queued)
	match := resetTokenPattern.FindStringSubmatch(queued.BodyText)
	require.Len(t, match, 2, "expected a reset token in the queued email body: %s", queued.BodyText)
	token := match[1]

	require.NoError(t, services.ResetPassword(context.Background(), database.Queries, dtos.ResetPasswordRequest{
		Token:    token,
		Password: newPassword,
	}))

	_, err := services.Login(context.Background(), database.Queries, dtos.LoginRequest{Email: email, Password: newPassword})
	assert.NoError(t, err, "login with the new password should succeed")

	_, err = services.Login(context.Background(), database.Queries, dtos.LoginRequest{Email: email, Password: oldPassword})
	assert.Error(t, err, "login with the old password should fail")
	assert.True(t, errors.Is(err, services.ErrInvalidCredentials))
}

func TestResetPassword_TokenIsSingleUse(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "reset_single_use")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testutil.CreatePasswordResetToken(t, userID, services.PasswordResetTokenTTL)

	require.NoError(t, services.ResetPassword(context.Background(), database.Queries, dtos.ResetPasswordRequest{
		Token:    token,
		Password: "NewTestPass456!",
	}))

	err := services.ResetPassword(context.Background(), database.Queries, dtos.ResetPasswordRequest{
		Token:    token,
		Password: "AnotherPass789!",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrResetTokenInvalid))
}

func TestResetPassword_ExpiredToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "reset_expired")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testutil.CreatePasswordResetToken(t, userID, -time.Hour)

	err := services.ResetPassword(context.Background(), database.Queries, dtos.ResetPasswordRequest{
		Token:    token,
		Password: "NewTestPass456!",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrResetTokenInvalid))
}

func TestResetPassword_UnknownToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	err := services.ResetPassword(context.Background(), database.Queries, dtos.ResetPasswordRequest{
		Token:    "totally-made-up-token",
		Password: "NewTestPass456!",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrResetTokenInvalid))
}

func TestResetPassword_InvalidatesTheUsersOtherTokens(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "reset_invalidate_others")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	require.NoError(t, services.RequestPasswordReset(context.Background(), database.Queries, dtos.ForgotPasswordRequest{Email: email}))
	first := testutil.LatestQueuedEmail(t, email)
	require.NotNil(t, first)
	firstToken := resetTokenPattern.FindStringSubmatch(first.BodyText)[1]

	require.NoError(t, services.RequestPasswordReset(context.Background(), database.Queries, dtos.ForgotPasswordRequest{Email: email}))
	second := testutil.LatestQueuedEmail(t, email)
	require.NotNil(t, second)
	secondToken := resetTokenPattern.FindStringSubmatch(second.BodyText)[1]
	require.NotEqual(t, firstToken, secondToken)

	require.NoError(t, services.ResetPassword(context.Background(), database.Queries, dtos.ResetPasswordRequest{
		Token:    secondToken,
		Password: "NewTestPass456!",
	}))

	// The first token, never itself consumed, must now be unusable too.
	err := services.ResetPassword(context.Background(), database.Queries, dtos.ResetPasswordRequest{
		Token:    firstToken,
		Password: "AnotherPass789!",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrResetTokenInvalid))

	tokens := testutil.PasswordResetTokensFor(t, userID)
	require.NotEmpty(t, tokens)
	for _, tok := range tokens {
		assert.True(t, tok.UsedAt.Valid, "expected every token row to be used after invalidation, id=%d", tok.ID)
	}
}

// TestResetPassword_ClearsTheLockout locks the account the same way
// TestLogin_AccountLocked does (tests/auth_service_test.go) -- a direct
// LockTestUserAccount call, not a real login-attempt loop, since only the
// lockout mechanism matters here, not how it was tripped.
func TestResetPassword_ClearsTheLockout(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "reset_clears_lockout")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	testutil.LockTestUserAccount(t, email, 15*time.Minute)

	token := testutil.CreatePasswordResetToken(t, userID, services.PasswordResetTokenTTL)
	newPassword := "NewTestPass456!"

	require.NoError(t, services.ResetPassword(context.Background(), database.Queries, dtos.ResetPasswordRequest{
		Token:    token,
		Password: newPassword,
	}))

	_, err := services.Login(context.Background(), database.Queries, dtos.LoginRequest{Email: email, Password: newPassword})
	assert.NoError(t, err, "login should succeed once the lockout is cleared")
}
