package services

import (
	"context"
	"fmt"

	"sight-reading/database/generated"
	"sight-reading/email"
	"sight-reading/logger"
)

// How long the links in each mail stay valid, as the reader sees it. The
// wording has to match whatever the token issuer actually enforces.
const (
	passwordResetExpiresIn = "1 hour"
	verifyEmailExpiresIn   = "24 hours"
	// changeEmailExpiresIn mirrors account_service.go's
	// ChangeEmailTokenTTL -- if that constant ever changes, this string
	// has to change with it, the same relationship every other
	// *ExpiresIn constant here has with its issuer.
	changeEmailExpiresIn = "1 hour"
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

	return enqueueDefaults{
		from:        from,
		appName:     cfg.FromName,
		maxAttempts: int32(envPositiveInt("EMAIL_MAX_ATTEMPTS", defaultMaxAttempts)),
	}
}

// EnqueuePasswordReset queues the "here is your reset link" mail.
//
// resetURL is built by the caller, with net/url, from PublicBaseURL and
// the token it just issued. Nothing here escapes or rewrites it.
func EnqueuePasswordReset(ctx context.Context, q generated.Querier, to, toName, firstName, resetURL string) error {
	defaults := emailEnqueueDefaults()

	return enqueue(ctx, q, defaults, email.TemplatePasswordReset, to, toName,
		fmt.Sprintf("Reset your %s password", defaults.appName),
		email.PasswordResetData{
			FirstName: firstName,
			ResetURL:  resetURL,
			ExpiresIn: passwordResetExpiresIn,
			AppName:   defaults.appName,
			AppURL:    PublicBaseURL(),
		})
}

// EnqueuePasswordResetGoogle queues the "you sign in with Google" notice,
// sent instead of a reset link when the requester's account has no
// password to reset.
func EnqueuePasswordResetGoogle(ctx context.Context, q generated.Querier, to, toName, firstName string) error {
	defaults := emailEnqueueDefaults()

	return enqueue(ctx, q, defaults, email.TemplatePasswordResetGoogle, to, toName,
		fmt.Sprintf("About your %s password reset request", defaults.appName),
		email.PasswordResetGoogleData{
			FirstName: firstName,
			AppName:   defaults.appName,
			AppURL:    PublicBaseURL(),
		})
}

// EnqueueVerifyEmail queues the mail that confirms a new account's
// address. It doubles as the welcome mail; there is no second one.
func EnqueueVerifyEmail(ctx context.Context, q generated.Querier, to, toName, firstName, verifyURL string) error {
	defaults := emailEnqueueDefaults()

	return enqueue(ctx, q, defaults, email.TemplateVerifyEmail, to, toName,
		fmt.Sprintf("Welcome to %s: confirm your email address", defaults.appName),
		email.VerifyEmailData{
			FirstName: firstName,
			VerifyURL: verifyURL,
			ExpiresIn: verifyEmailExpiresIn,
			AppName:   defaults.appName,
			AppURL:    PublicBaseURL(),
		})
}

// EnqueueEmailChange queues the "confirm your new address" mail, sent to
// the NEW address (to) -- the confirm link is worthless anywhere else,
// since clicking it is exactly what proves the requester controls that
// address.
func EnqueueEmailChange(ctx context.Context, q generated.Querier, to, toName, firstName, newEmail, confirmURL string) error {
	defaults := emailEnqueueDefaults()

	return enqueue(ctx, q, defaults, email.TemplateEmailChange, to, toName,
		fmt.Sprintf("Confirm your new %s email address", defaults.appName),
		email.EmailChangeData{
			FirstName:  firstName,
			ConfirmURL: confirmURL,
			NewEmail:   newEmail,
			ExpiresIn:  changeEmailExpiresIn,
			AppName:    defaults.appName,
			AppURL:     PublicBaseURL(),
		})
}

// EnqueueEmailChangeAlert queues the "your email address is changing"
// notice, sent to the OLD address (to) being replaced. It carries no
// confirm link: the recipient here is being told, not asked to act.
func EnqueueEmailChangeAlert(ctx context.Context, q generated.Querier, to, toName, firstName, newEmail string) error {
	defaults := emailEnqueueDefaults()

	return enqueue(ctx, q, defaults, email.TemplateEmailChangeAlert, to, toName,
		fmt.Sprintf("Your %s email address is changing", defaults.appName),
		email.EmailChangeAlertData{
			FirstName: firstName,
			NewEmail:  newEmail,
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
//
// defaults comes from the caller rather than being read again here: every
// Enqueue* function above already calls emailEnqueueDefaults for the
// subject line and the AppName template field, and re-reading the
// environment a second time per call would only risk the two reads
// disagreeing.
func enqueue(ctx context.Context, q generated.Querier, defaults enqueueDefaults, template, to, toName, subject string, data any) error {
	html, text, err := email.Render(template, data)
	if err != nil {
		logger.Error("Failed to render an email", "error", err.Error(), "template", template)
		return fmt.Errorf("render %q email template: %w", template, err)
	}

	// Minted once, here, and resent unchanged on every retry so a relay
	// that already accepted the message can recognise the redelivery.
	messageID, err := email.NewMessageID(defaults.from)
	if err != nil {
		logger.Error("Failed to mint a Message-ID", "error", err.Error(), "template", template)
		return fmt.Errorf("mint a message id for %q email: %w", template, err)
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
		return fmt.Errorf("write queued %q email row: %w", template, err)
	}

	logger.Info("Email queued", "template", template, "message_id", messageID)
	return nil
}
