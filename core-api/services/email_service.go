package services

import (
	"context"
	"fmt"
	"os"
	"strconv"

	"sight-reading/database/generated"
	"sight-reading/email"
	"sight-reading/logger"
)

// How long the links in each mail stay valid, as the reader sees it. The
// wording has to match whatever the token issuer actually enforces.
const (
	passwordResetExpiresIn = "1 hour"
	verifyEmailExpiresIn   = "24 hours"
)

// defaultMaxAttempts is the retry budget a queued message starts with when
// EMAIL_MAX_ATTEMPTS says nothing. It matches the column default.
const defaultMaxAttempts = 5

// defaultFromAddress supplies nothing but the Message-ID's domain, and
// only when EMAIL_FROM is unset. Nothing is ever delivered from it: an
// unconfigured service queues and holds. It exists so that enqueuing works
// on a laptop with no EMAIL_* variables set, which is how every local
// signup and password reset runs.
const defaultFromAddress = "no-reply@tremolonotes.com"

// enqueueDefaults is the handful of settings enqueuing needs. Delivery
// settings are the watcher's business, not this file's.
type enqueueDefaults struct {
	from        string
	appName     string
	maxAttempts int32
}

// emailEnqueueDefaults reads the enqueue-time settings from the
// environment, filling in a default for anything unset.
func emailEnqueueDefaults() enqueueDefaults {
	cfg := email.ConfigFromEnv()

	from := cfg.From
	if from == "" {
		from = defaultFromAddress
	}

	maxAttempts := defaultMaxAttempts
	if parsed, err := strconv.Atoi(os.Getenv("EMAIL_MAX_ATTEMPTS")); err == nil && parsed > 0 {
		maxAttempts = parsed
	}

	return enqueueDefaults{
		from:        from,
		appName:     cfg.FromName,
		maxAttempts: int32(maxAttempts),
	}
}

// EnqueuePasswordReset queues the "here is your reset link" mail.
//
// resetURL is built by the caller, with net/url, from PublicBaseURL and
// the token it just issued. Nothing here escapes or rewrites it.
func EnqueuePasswordReset(ctx context.Context, q generated.Querier, to, toName, firstName, resetURL string) error {
	defaults := emailEnqueueDefaults()

	return enqueue(ctx, q, email.TemplatePasswordReset, to, toName,
		fmt.Sprintf("Reset your %s password", defaults.appName),
		email.PasswordResetData{
			FirstName: firstName,
			ResetURL:  resetURL,
			ExpiresIn: passwordResetExpiresIn,
			AppName:   defaults.appName,
			AppURL:    PublicBaseURL(),
		})
}

// EnqueueVerifyEmail queues the mail that confirms a new account's
// address. It doubles as the welcome mail; there is no second one.
func EnqueueVerifyEmail(ctx context.Context, q generated.Querier, to, toName, firstName, verifyURL string) error {
	defaults := emailEnqueueDefaults()

	return enqueue(ctx, q, email.TemplateVerifyEmail, to, toName,
		fmt.Sprintf("Welcome to %s: confirm your email address", defaults.appName),
		email.VerifyEmailData{
			FirstName: firstName,
			VerifyURL: verifyURL,
			ExpiresIn: verifyEmailExpiresIn,
			AppName:   defaults.appName,
			AppURL:    PublicBaseURL(),
		})
}

// enqueue renders one message and writes it to the queue.
//
// It never touches SMTP. That is the whole point of the queue: signing up
// or asking for a password reset must not wait on a mail relay, and must
// not fail because one is slow, down, or not configured at all. The row is
// written; the watcher delivers it on its own clock.
//
// Rendering happens here, at enqueue, so the stored row carries final
// bodies. A template edit tomorrow cannot rewrite a mail that is already
// waiting to go out, and the watcher never has to load templates.
func enqueue(ctx context.Context, q generated.Querier, template, to, toName, subject string, data any) error {
	defaults := emailEnqueueDefaults()

	html, text, err := email.Render(template, data)
	if err != nil {
		logger.Error("Failed to render an email", "error", err.Error(), "template", template)
		return err
	}

	// Minted once, here, and resent unchanged on every retry so a relay
	// that already accepted the message can recognise the redelivery.
	messageID, err := email.NewMessageID(defaults.from)
	if err != nil {
		logger.Error("Failed to mint a Message-ID", "error", err.Error(), "template", template)
		return err
	}

	if _, err := q.EnqueueEmail(ctx, generated.EnqueueEmailParams{
		Recipient:     to,
		RecipientName: toName,
		Subject:       subject,
		Template:      template,
		BodyHtml:      html,
		BodyText:      text,
		MessageID:     messageID,
		MaxAttempts:   defaults.maxAttempts,
	}); err != nil {
		logger.Error("Failed to queue an email", "error", err.Error(), "template", template)
		return err
	}

	logger.Info("Email queued", "template", template, "message_id", messageID)
	return nil
}
