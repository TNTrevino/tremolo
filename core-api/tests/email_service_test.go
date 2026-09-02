package tests

import (
	"context"
	"testing"

	"sight-reading/database"
	"sight-reading/email"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// None of the email tests call t.Parallel. The watcher's claim query is
// global on purpose — it claims whatever is claimable, which is what a
// queue drainer does — so two email tests running at once would hand each
// other's rows to a relay. Go runs the package's non-parallel tests to
// completion before it resumes any parallel one, which is exactly the
// isolation this needs.

const (
	testResetURL  = "https://tremolonotes.com/reset-password?token=abc-_123"
	testVerifyURL = "https://tremolonotes.com/verify-email?token=xyz-_789"
)

func TestEnqueuePasswordReset_WritesOnePendingRow(t *testing.T) {
	testutil.SetupTestDB(t)

	recipient := testutil.UniqueEmail(t, "email_reset")
	t.Cleanup(func() { testutil.DeleteQueuedEmails(t, recipient) })

	err := services.EnqueuePasswordReset(context.Background(), database.Queries,
		recipient, "Avery Reed", "Avery", testResetURL)
	require.NoError(t, err)

	rows := testutil.QueuedEmailsFor(t, recipient)
	require.Len(t, rows, 1)
	row := rows[0]

	assert.Equal(t, recipient, row.Recipient)
	assert.Equal(t, "Avery Reed", row.RecipientName)
	assert.Equal(t, "pending", row.Status)
	assert.Equal(t, int32(0), row.Attempts)
	assert.Equal(t, email.TemplatePasswordReset, row.Template)
	assert.NotEmpty(t, row.MessageID)
	assert.NotEmpty(t, row.Subject)

	// The row carries final bodies, not template input: the link has to
	// already be in both of them.
	assert.Contains(t, row.BodyHtml, testResetURL)
	assert.Contains(t, row.BodyText, testResetURL)
}

func TestEnqueueVerifyEmail_WritesOnePendingRow(t *testing.T) {
	testutil.SetupTestDB(t)

	recipient := testutil.UniqueEmail(t, "email_verify")
	t.Cleanup(func() { testutil.DeleteQueuedEmails(t, recipient) })

	err := services.EnqueueVerifyEmail(context.Background(), database.Queries,
		recipient, "Avery Reed", "Avery", testVerifyURL)
	require.NoError(t, err)

	rows := testutil.QueuedEmailsFor(t, recipient)
	require.Len(t, rows, 1)
	row := rows[0]

	assert.Equal(t, recipient, row.Recipient)
	assert.Equal(t, "pending", row.Status)
	assert.Equal(t, int32(0), row.Attempts)
	assert.Equal(t, email.TemplateVerifyEmail, row.Template)
	assert.NotEmpty(t, row.MessageID)
	assert.Contains(t, row.BodyHtml, testVerifyURL)
	assert.Contains(t, row.BodyText, testVerifyURL)
}

// message_id is UNIQUE, so a shared identifier would not merely confuse a
// relay -- the second enqueue would fail outright.
func TestEnqueue_MessageIDsAreDistinctAcrossCalls(t *testing.T) {
	testutil.SetupTestDB(t)

	recipient := testutil.UniqueEmail(t, "email_ids")
	t.Cleanup(func() { testutil.DeleteQueuedEmails(t, recipient) })

	ctx := context.Background()
	require.NoError(t, services.EnqueuePasswordReset(ctx, database.Queries,
		recipient, "Avery Reed", "Avery", testResetURL))
	require.NoError(t, services.EnqueuePasswordReset(ctx, database.Queries,
		recipient, "Avery Reed", "Avery", testResetURL))

	rows := testutil.QueuedEmailsFor(t, recipient)
	require.Len(t, rows, 2)
	assert.NotEqual(t, rows[0].MessageID, rows[1].MessageID)
}

// Enqueuing never touches SMTP. A relay that is unconfigured, or down,
// must not turn "I forgot my password" into an error page -- the row is
// written and the watcher delivers it whenever there is somewhere to
// deliver it to.
func TestEnqueue_SucceedsWithSMTPUnconfigured(t *testing.T) {
	testutil.SetupTestDB(t)

	// t.Setenv forbids t.Parallel, which these tests do not use anyway.
	t.Setenv("EMAIL_SMTP_HOST", "")
	t.Setenv("EMAIL_FROM", "")

	recipient := testutil.UniqueEmail(t, "email_unconfigured")
	t.Cleanup(func() { testutil.DeleteQueuedEmails(t, recipient) })

	err := services.EnqueuePasswordReset(context.Background(), database.Queries,
		recipient, "Avery Reed", "Avery", testResetURL)
	require.NoError(t, err)

	row := testutil.LatestQueuedEmail(t, recipient)
	require.NotNil(t, row)
	assert.Equal(t, "pending", row.Status)
	assert.NotEmpty(t, row.MessageID)
}
