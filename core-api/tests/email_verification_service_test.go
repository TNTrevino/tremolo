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

// resetTokenPattern (password_reset_service_test.go) is reused here: it
// only looks for a "token=" query parameter, which is exactly as true of
// a "/verify-email?token=..." link as of a "/reset-password?token=..." one.

// ---------- SendVerificationEmail ----------

func TestSendVerificationEmail_EnqueuesALinkAndAToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "verify_send")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	err := services.SendVerificationEmail(context.Background(), database.Queries, userID, email, "Test")
	require.NoError(t, err)

	queued := testutil.QueuedEmailsFor(t, email)
	require.Len(t, queued, 1, "expected exactly one queued email")
	assert.Equal(t, "verify-email", queued[0].Template)
	assert.Contains(t, queued[0].BodyText, "/verify-email?token=")

	tokens := testutil.EmailTokensFor(t, userID, services.PurposeVerifyEmail)
	unused := 0
	for _, tok := range tokens {
		if !tok.UsedAt.Valid {
			unused++
		}
	}
	assert.Equal(t, 1, unused, "expected exactly one unused token row")
}

func TestSendVerificationEmail_InvalidatesThePreviousToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "verify_send_invalidate")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	require.NoError(t, services.SendVerificationEmail(context.Background(), database.Queries, userID, email, "Test"))
	first := testutil.LatestQueuedEmail(t, email)
	require.NotNil(t, first)
	firstToken := resetTokenPattern.FindStringSubmatch(first.BodyText)[1]

	require.NoError(t, services.SendVerificationEmail(context.Background(), database.Queries, userID, email, "Test"))
	second := testutil.LatestQueuedEmail(t, email)
	require.NotNil(t, second)
	secondToken := resetTokenPattern.FindStringSubmatch(second.BodyText)[1]
	require.NotEqual(t, firstToken, secondToken)

	// The first token, invalidated by the second SendVerificationEmail
	// call before it ever got redeemed, must now be unusable.
	err := services.VerifyEmail(context.Background(), database.Queries, dtos.VerifyEmailRequest{Token: firstToken})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrEmailTokenInvalid))

	tokens := testutil.EmailTokensFor(t, userID, services.PurposeVerifyEmail)
	require.Len(t, tokens, 2)
	unused := 0
	for _, tok := range tokens {
		if !tok.UsedAt.Valid {
			unused++
		}
	}
	assert.Equal(t, 1, unused, "only the newest (second) token should remain unused")
}

// ---------- VerifyEmail ----------

// TestVerifyEmail_EndToEnd_TheEmailedLinkWorks is the headline case: a
// real send, pulling the token out of the queued mail body exactly as a
// user's browser would after clicking the link, and a real verification.
// The token is never handled directly -- only its hash is ever stored --
// so this is the only test that proves the whole loop closes.
func TestVerifyEmail_EndToEnd_TheEmailedLinkWorks(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "verify_e2e")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	require.NoError(t, services.SendVerificationEmail(context.Background(), database.Queries, userID, email, "Test"))

	queued := testutil.LatestQueuedEmail(t, email)
	require.NotNil(t, queued)
	match := resetTokenPattern.FindStringSubmatch(queued.BodyText)
	require.Len(t, match, 2, "expected a verification token in the queued email body: %s", queued.BodyText)
	token := match[1]

	require.NoError(t, services.VerifyEmail(context.Background(), database.Queries, dtos.VerifyEmailRequest{Token: token}))

	user := testutil.GetTestUserByEmail(t, email)
	require.NotNil(t, user)
	assert.True(t, user.EmailVerifiedAt.Valid, "expected email_verified_at to be set after verification")
}

func TestVerifyEmail_TokenIsSingleUse(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "verify_single_use")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testutil.CreateEmailToken(t, userID, services.PurposeVerifyEmail, email, services.VerifyEmailTokenTTL)

	require.NoError(t, services.VerifyEmail(context.Background(), database.Queries, dtos.VerifyEmailRequest{Token: token}))

	err := services.VerifyEmail(context.Background(), database.Queries, dtos.VerifyEmailRequest{Token: token})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrEmailTokenInvalid))
}

func TestVerifyEmail_ExpiredToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "verify_expired")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	token := testutil.CreateEmailToken(t, userID, services.PurposeVerifyEmail, email, -time.Hour)

	err := services.VerifyEmail(context.Background(), database.Queries, dtos.VerifyEmailRequest{Token: token})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrEmailTokenInvalid))
}

func TestVerifyEmail_UnknownToken(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	err := services.VerifyEmail(context.Background(), database.Queries, dtos.VerifyEmailRequest{Token: "totally-made-up-token"})
	require.Error(t, err)
	assert.True(t, errors.Is(err, services.ErrEmailTokenInvalid))
}

// TestVerifyEmail_IsIdempotentOnTheUserRow proves MarkEmailVerified's
// coalesce guard: redeeming a second, independently-minted token for the
// same address must not move email_verified_at once it is already set.
func TestVerifyEmail_IsIdempotentOnTheUserRow(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "verify_idempotent")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	firstToken := testutil.CreateEmailToken(t, userID, services.PurposeVerifyEmail, email, services.VerifyEmailTokenTTL)
	require.NoError(t, services.VerifyEmail(context.Background(), database.Queries, dtos.VerifyEmailRequest{Token: firstToken}))
	firstVerifiedAt := testutil.GetTestUserByEmail(t, email).EmailVerifiedAt.Time

	secondToken := testutil.CreateEmailToken(t, userID, services.PurposeVerifyEmail, email, services.VerifyEmailTokenTTL)
	require.NoError(t, services.VerifyEmail(context.Background(), database.Queries, dtos.VerifyEmailRequest{Token: secondToken}))
	secondVerifiedAt := testutil.GetTestUserByEmail(t, email).EmailVerifiedAt.Time

	assert.True(t, firstVerifiedAt.Equal(secondVerifiedAt), "email_verified_at must not move on a second verification")
}

// ---------- ResendVerification ----------

func TestResendVerification_AlreadyVerified_IsANoOp(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "resend_verified")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")
	testutil.MarkTestUserVerified(t, userID)

	err := services.ResendVerification(context.Background(), database.Queries, userID)
	require.NoError(t, err)

	assert.Empty(t, testutil.QueuedEmailsFor(t, email))
}

func TestResendVerification_Unverified_Enqueues(t *testing.T) {
	t.Parallel()
	testutil.SetupTestDB(t)

	email := testutil.UniqueEmail(t, "resend_unverified")
	userID := testutil.CreateTestUserWithDefaults(t, email, "STUDENT")

	err := services.ResendVerification(context.Background(), database.Queries, userID)
	require.NoError(t, err)

	queued := testutil.QueuedEmailsFor(t, email)
	require.Len(t, queued, 1)
	assert.Equal(t, "verify-email", queued[0].Template)
}
