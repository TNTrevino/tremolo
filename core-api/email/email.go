// Package email owns outbound mail: the message shape, the SMTP sender,
// and the templates that produce a message body.
//
// Nothing here talks to the database or to a request. A caller renders a
// message (see Render), stores it, and hands it to a Sender when it is
// time to deliver. That split is what lets signup and password-reset
// answer immediately while delivery happens on the queue watcher's clock.
package email

import (
	"context"
	"errors"
)

// ErrNotConfigured is returned by a Sender that has no relay to talk to.
// It is a distinct error rather than a generic failure so a caller can
// tell "we could not reach the relay" from "no relay was configured",
// and so the watcher can decline to burn a delivery attempt on it.
var ErrNotConfigured = errors.New("email: SMTP is not configured")

// Message is one outbound email, fully rendered.
//
// Bodies are final text, not template input: rendering happens at enqueue
// so a template change can never silently rewrite a mail that is already
// sitting in the queue, and the watcher never has to load templates.
//
// There are no JSON tags because a Message is never a wire shape — it is
// built from a database row and consumed by a Sender.
type Message struct {
	// To is the recipient address.
	To string
	// ToName is the recipient's display name. Empty is fine; the sender
	// falls back to a bare address.
	ToName string
	// Subject is the subject line.
	Subject string
	// HTML is the rendered HTML body.
	HTML string
	// Text is the rendered plain-text body, sent as the multipart
	// alternative for clients that will not render HTML.
	Text string
	// MessageID is the RFC 5322 Message-ID value without angle brackets.
	// It is minted once at enqueue and reused on every retry so a relay
	// that already accepted the mail can recognise a duplicate.
	MessageID string
	// Template names the template pair the bodies were rendered from.
	// Carried for logging and support questions, never for re-rendering.
	Template string
}

// Sender delivers a Message.
//
// This is the seam tests replace, exactly as services.GoogleTokenVerifier
// is for Google OAuth: production wires SMTPSender, tests wire a fake that
// records what it was asked to send and can be told to fail.
type Sender interface {
	Send(ctx context.Context, msg Message) error
}
