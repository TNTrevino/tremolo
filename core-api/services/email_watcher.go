package services

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strconv"
	"time"

	"sight-reading/database/generated"
	"sight-reading/email"
	"sight-reading/logger"
)

// Watcher defaults. Every one of them is tuned for "a school app sending a
// few password resets an hour", not for a bulk mailer.
const (
	// defaultWatcherInterval is how often the queue is drained. A reader
	// who just asked for a reset waits at most this long.
	defaultWatcherInterval = 30 * time.Second

	// defaultBatchSize is how many messages one tick delivers.
	defaultBatchSize = 10

	// defaultClaimLease is how long a claim stays valid. A watcher that
	// dies mid-send leaves the row claimed; after this long, another
	// watcher treats it as abandoned and picks it back up.
	defaultClaimLease = 5 * time.Minute

	// backoffBase is the delay after the first failure, doubling from
	// there.
	backoffBase = 60 * time.Second

	// backoffCap stops the doubling. Beyond an hour the delay stops
	// protecting the relay and just strands the message.
	backoffCap = time.Hour

	// defaultSendTimeout bounds one delivery.
	defaultSendTimeout = 20 * time.Second
)

// EmailWatcherConfig is how the queue drainer is tuned.
type EmailWatcherConfig struct {
	// Enabled is false when there is no relay configured. A disabled
	// watcher still runs; it just does not claim anything.
	Enabled bool
	// Interval is the gap between ticks.
	Interval time.Duration
	// BatchSize is the most messages one tick claims.
	BatchSize int32
	// ClaimLease is how long a claim survives before another watcher may
	// take the row back.
	ClaimLease time.Duration
	// BackoffBase and BackoffCap bound the retry delay.
	BackoffBase time.Duration
	BackoffCap  time.Duration
	// SendTimeout bounds one delivery attempt.
	SendTimeout time.Duration
}

// EmailWatcherConfigFromEnv reads the watcher's settings, taking whether
// email is enabled from the caller: that is a property of the SMTP
// configuration, which the email package already decided.
func EmailWatcherConfigFromEnv(enabled bool) EmailWatcherConfig {
	return EmailWatcherConfig{
		Enabled:     enabled,
		Interval:    envSeconds("EMAIL_WATCHER_INTERVAL_SECONDS", defaultWatcherInterval),
		BatchSize:   int32(envPositiveInt("EMAIL_BATCH_SIZE", defaultBatchSize)),
		ClaimLease:  envSeconds("EMAIL_CLAIM_LEASE_SECONDS", defaultClaimLease),
		BackoffBase: backoffBase,
		BackoffCap:  backoffCap,
		SendTimeout: envSeconds("EMAIL_SEND_TIMEOUT_SECONDS", defaultSendTimeout),
	}
}

// EmailWatcher drains the outbound email queue.
type EmailWatcher struct {
	q      generated.Querier
	sender email.Sender
	cfg    EmailWatcherConfig
}

// NewEmailWatcher builds a watcher over one queue and one sender.
func NewEmailWatcher(q generated.Querier, sender email.Sender, cfg EmailWatcherConfig) *EmailWatcher {
	return &EmailWatcher{q: q, sender: sender, cfg: cfg}
}

// Run ticks until ctx is cancelled, then returns.
//
// The first tick lands after one Interval, not immediately: Run is built
// on time.NewTicker, which fires for the first time only once the interval
// has elapsed. A freshly booted service therefore waits out one interval
// -- 30 seconds by default -- before its first claim.
//
// A tick that is cut short by shutdown leaves its rows claimed. That is
// what the lease is for: the next watcher to start finds them expired and
// takes them back, rather than the messages being stranded.
func (w *EmailWatcher) Run(ctx context.Context) {
	ticker := time.NewTicker(w.cfg.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			logger.Info("Email watcher stopped")
			return
		case <-ticker.C:
			sent, failed, err := w.Tick(ctx)
			if err != nil {
				logger.Error("Email watcher tick failed", "error", err.Error())
				continue
			}
			if sent > 0 || failed > 0 {
				logger.Info("Email queue drained", "sent", sent, "failed", failed)
			}
		}
	}
}

// Tick claims a batch and tries to deliver each message, returning how
// many went out and how many did not.
//
// It is the seam the tests drive: Run is a ticker around this.
//
// A message that a relay refuses is not a tick failure. The error return
// is for the claim itself -- a database that cannot be reached -- and one
// refused message must never cost the rest of the batch its turn.
func (w *EmailWatcher) Tick(ctx context.Context) (int, int, error) {
	if !w.cfg.Enabled {
		// Queue and hold. Claiming here would spend an attempt against a
		// relay that was never configured, and five ticks later the
		// message would be dead without anyone having tried to send it.
		return 0, 0, nil
	}

	rows, err := w.q.ClaimQueuedEmails(ctx, generated.ClaimQueuedEmailsParams{
		ClaimLeaseSeconds: int32(w.cfg.ClaimLease.Seconds()),
		BatchSize:         w.cfg.BatchSize,
	})
	if err != nil {
		return 0, 0, fmt.Errorf("failed to claim queued emails: %w", err)
	}

	var sent, failed int
	for _, row := range rows {
		if w.deliver(ctx, row) {
			sent++
			continue
		}
		failed++
	}

	return sent, failed, nil
}

// deliver sends one claimed row and records what happened to it. It
// reports whether the message went out.
func (w *EmailWatcher) deliver(ctx context.Context, row generated.TremoloQueuedEmail) bool {
	sendCtx, cancel := context.WithTimeout(ctx, w.cfg.SendTimeout)
	defer cancel()

	sendErr := w.sender.Send(sendCtx, email.Message{
		To:        row.Recipient,
		ToName:    row.RecipientName,
		Subject:   row.Subject,
		HTML:      row.BodyHtml,
		Text:      row.BodyText,
		MessageID: row.MessageID,
		Template:  row.Template,
	})

	// The claim already incremented attempts, so row.Attempts is this
	// attempt's number: 1 the first time round.
	w.recordAttempt(ctx, row, sendErr)

	if sendErr == nil {
		if err := w.q.MarkEmailSent(ctx, row.ID); err != nil {
			// The message did go out; only the bookkeeping failed. The
			// row stays claimed and the lease will offer it again, which
			// risks a duplicate -- the honest trade against marking a
			// delivered message as failed and never sending it. The
			// mitigation is already in place: a reclaim resends this same
			// row, so it carries the same Message-ID (email.NewMessageID)
			// and the same X-Entity-Ref-ID derived from it
			// (SMTPSender.buildMsg), and a mail client collapses the two
			// deliveries into one thread instead of showing the reader
			// two separate messages.
			logger.Error("Failed to mark an email as sent",
				"error", err.Error(), "queued_email_id", row.ID)
		}
		return true
	}

	if row.Attempts >= row.MaxAttempts {
		logger.Error("Giving up on an email",
			"error", sendErr.Error(),
			"queued_email_id", row.ID,
			"template", row.Template,
			"attempts", row.Attempts)

		if err := w.q.MarkEmailDead(ctx, generated.MarkEmailDeadParams{
			ID:        row.ID,
			LastError: sql.NullString{String: sendErr.Error(), Valid: true},
		}); err != nil {
			logger.Error("Failed to mark an email as dead",
				"error", err.Error(), "queued_email_id", row.ID)
		}
		return false
	}

	backoff := backoffFor(row.Attempts, w.cfg.BackoffBase, w.cfg.BackoffCap)
	logger.Warn("Email delivery failed; will retry",
		"error", sendErr.Error(),
		"queued_email_id", row.ID,
		"attempts", row.Attempts,
		"retry_in", backoff.String())

	if err := w.q.RescheduleEmail(ctx, generated.RescheduleEmailParams{
		ID:             row.ID,
		BackoffSeconds: int32(backoff.Seconds()),
		LastError:      sql.NullString{String: sendErr.Error(), Valid: true},
	}); err != nil {
		logger.Error("Failed to reschedule an email",
			"error", err.Error(), "queued_email_id", row.ID)
	}

	return false
}

// recordAttempt logs one try to the attempts table.
//
// A failure to write the log is logged and swallowed: this is
// bookkeeping, and losing a row of it must not change what happens to the
// message -- the same call the login lockout counter makes.
func (w *EmailWatcher) recordAttempt(ctx context.Context, row generated.TremoloQueuedEmail, sendErr error) {
	params := generated.RecordEmailSendAttemptParams{
		QueuedEmailID: row.ID,
		AttemptNumber: row.Attempts,
		Succeeded:     sendErr == nil,
	}
	if sendErr != nil {
		params.Error = sql.NullString{String: sendErr.Error(), Valid: true}
	}

	if err := w.q.RecordEmailSendAttempt(ctx, params); err != nil {
		logger.Error("Failed to record an email send attempt",
			"error", err.Error(), "queued_email_id", row.ID)
	}
}

// backoffFor is the delay before the next try after `attempt` failures:
// base, doubling each time, never past maxDelay.
//
// It doubles one step at a time and checks the bound after every step,
// rather than computing base<<(attempt-1) and checking once at the end. A
// single large shift can overflow int64 before anything looks at the
// result: for a big enough attempt it wraps through negative and, a few
// attempts later, can land back on a small positive value indistinguishable
// from a real backoff. Checking after every step means delay is never more
// than maxDelay when it is doubled again, so the doubling itself can never
// overflow, however large attempt is -- and the loop still exits in a
// handful of iterations, since it stops the moment delay passes maxDelay.
func backoffFor(attempt int32, base, maxDelay time.Duration) time.Duration {
	if attempt < 1 {
		attempt = 1
	}

	delay := base
	for i := int32(1); i < attempt; i++ {
		if delay <= 0 || delay > maxDelay {
			break
		}
		delay *= 2
	}

	if delay <= 0 || delay > maxDelay {
		return maxDelay
	}
	return delay
}

// envSeconds reads a whole number of seconds from the environment,
// falling back on anything that is not a positive number.
func envSeconds(name string, fallback time.Duration) time.Duration {
	return time.Duration(envPositiveInt(name, int(fallback.Seconds()))) * time.Second
}

// envPositiveInt reads a positive integer from the environment. A typo in
// a batch size should not stop the service from booting, so anything
// unparseable or non-positive falls back.
func envPositiveInt(name string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(name))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}
