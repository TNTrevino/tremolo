package tests

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"sight-reading/database"
	"sight-reading/database/generated"
	"sight-reading/email"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Like the enqueue tests, none of these run in parallel: the claim query
// takes whatever is claimable, so two watcher tests at once would drain
// each other's rows. Each one starts from an empty queue for the same
// reason -- counts are only meaningful when nothing else is waiting.

var errRelayRefused = errors.New("relay refused the message")

// testWatcherConfig is the production shape with a short lease and
// timeout, so a test never waits on either.
func testWatcherConfig() services.EmailWatcherConfig {
	return services.EmailWatcherConfig{
		Enabled:     true,
		Interval:    10 * time.Millisecond,
		BatchSize:   10,
		ClaimLease:  5 * time.Minute,
		BackoffBase: 60 * time.Second,
		BackoffCap:  time.Hour,
		SendTimeout: 5 * time.Second,
	}
}

// markClaimed forces a row into the state a watcher leaves behind while a
// send is in flight. Only a crash produces it for real, which is why the
// tests have to write it by hand.
func markClaimed(t *testing.T, id int64, claimedAt time.Time) {
	t.Helper()

	_, err := database.DBConn.ExecContext(context.Background(),
		"update tremolo.queued_emails set status = 'sending', claimed_at = $2 where id = $1",
		id, claimedAt)
	require.NoError(t, err)
}

// makeClaimableAgain clears a row's backoff so the next Tick picks it up
// without the test waiting out a real sixty-second delay.
func makeClaimableAgain(t *testing.T, id int64) {
	t.Helper()

	require.NoError(t, database.Queries.RescheduleEmail(context.Background(),
		generated.RescheduleEmailParams{
			BackoffSeconds: 0,
			LastError:      sql.NullString{String: "nudged by the test", Valid: true},
			ID:             id,
		}))
}

func TestWatcherTick_DeliversAPendingRow(t *testing.T) {
	testutil.SetupTestDB(t)
	testutil.ClearQueuedEmails(t)

	recipient := testutil.UniqueEmail(t, "watcher_deliver")
	row := testutil.EnqueueTestEmail(t, recipient)

	sender := testutil.NewFakeSender()
	watcher := services.NewEmailWatcher(database.Queries, sender, testWatcherConfig())

	sent, failed, err := watcher.Tick(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 1, sent)
	assert.Equal(t, 0, failed)

	after := testutil.LatestQueuedEmail(t, recipient)
	require.NotNil(t, after)
	assert.Equal(t, "sent", after.Status)
	assert.True(t, after.SentAt.Valid, "a sent row must carry the time it went out")
	assert.Equal(t, int32(1), after.Attempts)
	assert.False(t, after.ClaimedAt.Valid, "a finished row must not stay claimed")

	attempts := testutil.EmailSendAttempts(t, row.ID)
	require.Len(t, attempts, 1)
	assert.True(t, attempts[0].Succeeded)
	assert.Equal(t, int32(1), attempts[0].AttemptNumber)

	// The relay must be handed the identifier the row was enqueued with,
	// not a fresh one.
	require.Len(t, sender.Sent, 1)
	assert.Equal(t, row.MessageID, sender.Sent[0].MessageID)
	assert.Equal(t, recipient, sender.Sent[0].To)
}

func TestWatcherTick_RetriesAFailedSend(t *testing.T) {
	testutil.SetupTestDB(t)
	testutil.ClearQueuedEmails(t)

	recipient := testutil.UniqueEmail(t, "watcher_retry")
	row := testutil.EnqueueTestEmail(t, recipient)

	watcher := services.NewEmailWatcher(database.Queries,
		testutil.NewFailingSender(errRelayRefused), testWatcherConfig())

	sent, failed, err := watcher.Tick(context.Background())
	require.NoError(t, err, "one refused message is not a tick failure")
	assert.Equal(t, 0, sent)
	assert.Equal(t, 1, failed)

	after := testutil.LatestQueuedEmail(t, recipient)
	require.NotNil(t, after)
	assert.Equal(t, "pending", after.Status)
	assert.Equal(t, int32(1), after.Attempts)
	assert.False(t, after.ClaimedAt.Valid)
	require.True(t, after.NextAttemptAt.Valid)
	assert.True(t, after.NextAttemptAt.Time.After(time.Now()),
		"a rescheduled row must wait before it is claimable again")
	require.True(t, after.LastError.Valid)
	assert.Contains(t, after.LastError.String, errRelayRefused.Error())

	attempts := testutil.EmailSendAttempts(t, row.ID)
	require.Len(t, attempts, 1)
	assert.False(t, attempts[0].Succeeded)
	require.True(t, attempts[0].Error.Valid)
	assert.Contains(t, attempts[0].Error.String, errRelayRefused.Error())
}

func TestWatcherTick_MarksDeadAfterMaxAttempts(t *testing.T) {
	testutil.SetupTestDB(t)
	testutil.ClearQueuedEmails(t)

	recipient := testutil.UniqueEmail(t, "watcher_dead")
	row := testutil.EnqueueTestEmailWithMaxAttempts(t, recipient, 2)

	watcher := services.NewEmailWatcher(database.Queries,
		testutil.NewFailingSender(errRelayRefused), testWatcherConfig())

	_, failed, err := watcher.Tick(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 1, failed)
	assert.Equal(t, "pending", testutil.LatestQueuedEmail(t, recipient).Status,
		"one attempt of two is not the end of the road")

	makeClaimableAgain(t, row.ID)

	_, failed, err = watcher.Tick(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 1, failed)

	after := testutil.LatestQueuedEmail(t, recipient)
	require.NotNil(t, after)
	assert.Equal(t, "dead", after.Status)
	assert.Equal(t, int32(2), after.Attempts)
	assert.False(t, after.ClaimedAt.Valid)

	assert.Len(t, testutil.EmailSendAttempts(t, row.ID), 2,
		"every try is logged, including the one that gave up")
}

// The Message-ID is the queue's idempotency key. A relay that accepted the
// message and then dropped the connection has to see the same identifier
// on the redelivery, or the reader gets two mails.
func TestWatcherTick_ReusesTheMessageIDAcrossRetries(t *testing.T) {
	testutil.SetupTestDB(t)
	testutil.ClearQueuedEmails(t)

	recipient := testutil.UniqueEmail(t, "watcher_msgid")
	row := testutil.EnqueueTestEmail(t, recipient)

	sender := testutil.NewFailingSender(errRelayRefused)
	watcher := services.NewEmailWatcher(database.Queries, sender, testWatcherConfig())

	_, _, err := watcher.Tick(context.Background())
	require.NoError(t, err)

	makeClaimableAgain(t, row.ID)

	_, _, err = watcher.Tick(context.Background())
	require.NoError(t, err)

	require.Len(t, sender.Sent, 2)
	assert.Equal(t, sender.Sent[0].MessageID, sender.Sent[1].MessageID)
	assert.Equal(t, row.MessageID, sender.Sent[0].MessageID)
}

// A watcher killed mid-send leaves a row claimed. Nothing else will ever
// touch it, so the claim has to expire.
func TestWatcherTick_ReclaimsAStaleSendingRow(t *testing.T) {
	testutil.SetupTestDB(t)
	testutil.ClearQueuedEmails(t)

	recipient := testutil.UniqueEmail(t, "watcher_stale")
	row := testutil.EnqueueTestEmail(t, recipient)

	cfg := testWatcherConfig()
	markClaimed(t, row.ID, time.Now().Add(-2*cfg.ClaimLease))

	sender := testutil.NewFakeSender()
	watcher := services.NewEmailWatcher(database.Queries, sender, cfg)

	sent, _, err := watcher.Tick(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 1, sent)

	after := testutil.LatestQueuedEmail(t, recipient)
	require.NotNil(t, after)
	assert.Equal(t, "sent", after.Status)
	assert.Len(t, sender.Sent, 1)
}

// The other half of the lease: a row a live watcher claimed a moment ago
// is somebody else's work in progress.
func TestWatcherTick_LeavesAFreshSendingRowAlone(t *testing.T) {
	testutil.SetupTestDB(t)
	testutil.ClearQueuedEmails(t)

	recipient := testutil.UniqueEmail(t, "watcher_fresh")
	row := testutil.EnqueueTestEmail(t, recipient)
	markClaimed(t, row.ID, time.Now())

	sender := testutil.NewFakeSender()
	watcher := services.NewEmailWatcher(database.Queries, sender, testWatcherConfig())

	sent, failed, err := watcher.Tick(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 0, sent)
	assert.Equal(t, 0, failed)
	assert.Empty(t, sender.Sent)

	after := testutil.LatestQueuedEmail(t, recipient)
	require.NotNil(t, after)
	assert.Equal(t, "sending", after.Status)
}

// With no relay configured the queue holds. Claiming a row would burn an
// attempt against a server that was never there, and five ticks later the
// message would be dead without anyone having tried to send it.
func TestWatcherTick_HoldsWhenDisabled(t *testing.T) {
	testutil.SetupTestDB(t)
	testutil.ClearQueuedEmails(t)

	recipient := testutil.UniqueEmail(t, "watcher_disabled")
	testutil.EnqueueTestEmail(t, recipient)

	cfg := testWatcherConfig()
	cfg.Enabled = false

	sender := testutil.NewFakeSender()
	watcher := services.NewEmailWatcher(database.Queries, sender, cfg)

	sent, failed, err := watcher.Tick(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 0, sent)
	assert.Equal(t, 0, failed)
	assert.Empty(t, sender.Sent)

	after := testutil.LatestQueuedEmail(t, recipient)
	require.NotNil(t, after)
	assert.Equal(t, "pending", after.Status)
	assert.Equal(t, int32(0), after.Attempts, "a held row must not even be claimed")
}

func TestWatcherTick_OneFailureDoesNotAbortTheBatch(t *testing.T) {
	testutil.SetupTestDB(t)
	testutil.ClearQueuedEmails(t)

	first := testutil.EnqueueTestEmail(t, testutil.UniqueEmail(t, "watcher_batch_1"))
	second := testutil.EnqueueTestEmail(t, testutil.UniqueEmail(t, "watcher_batch_2"))
	third := testutil.EnqueueTestEmail(t, testutil.UniqueEmail(t, "watcher_batch_3"))

	sender := testutil.NewFakeSender()
	sender.SendFn = func(_ context.Context, msg email.Message) error {
		if msg.MessageID == second.MessageID {
			return errRelayRefused
		}
		return nil
	}

	watcher := services.NewEmailWatcher(database.Queries, sender, testWatcherConfig())

	sent, failed, err := watcher.Tick(context.Background())
	require.NoError(t, err)
	assert.Equal(t, 2, sent)
	assert.Equal(t, 1, failed)

	assert.Equal(t, "sent", testutil.LatestQueuedEmail(t, first.Recipient).Status)
	assert.Equal(t, "pending", testutil.LatestQueuedEmail(t, second.Recipient).Status)
	assert.Equal(t, "sent", testutil.LatestQueuedEmail(t, third.Recipient).Status)
}

func TestWatcherRun_ReturnsWhenTheContextIsCancelled(t *testing.T) {
	testutil.SetupTestDB(t)
	testutil.ClearQueuedEmails(t)

	watcher := services.NewEmailWatcher(database.Queries, testutil.NewFakeSender(), testWatcherConfig())

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		defer close(done)
		watcher.Run(ctx)
	}()

	cancel()

	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("Run did not return after its context was cancelled")
	}
}
