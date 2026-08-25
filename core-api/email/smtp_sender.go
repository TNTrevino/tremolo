package email

import (
	"context"
	"fmt"

	"github.com/wneessen/go-mail"
)

// SMTPSender delivers mail through a single SMTP relay.
//
// It holds configuration only. The connection is opened per send and
// closed again, which is the right trade for a queue watcher that sends a
// handful of messages every thirty seconds and would otherwise have to
// keep a connection healthy across idle minutes.
type SMTPSender struct {
	cfg Config
}

// Compile-time proof that the production sender satisfies the seam tests
// replace.
var _ Sender = (*SMTPSender)(nil)

// NewSMTPSender constructs the production Sender for cfg.
func NewSMTPSender(cfg Config) *SMTPSender {
	return &SMTPSender{cfg: cfg}
}

// Send delivers one message, returning ErrNotConfigured when there is no
// relay to deliver it to.
func (s *SMTPSender) Send(ctx context.Context, msg Message) error {
	if !s.cfg.Enabled() {
		return ErrNotConfigured
	}

	m, err := s.buildMsg(msg)
	if err != nil {
		return err
	}

	client, err := mail.NewClient(
		s.cfg.Host,
		mail.WithPort(s.cfg.Port),
		mail.WithSMTPAuth(mail.SMTPAuthPlain),
		mail.WithUsername(s.cfg.Username),
		mail.WithPassword(s.cfg.Password),
		// Mandatory, not opportunistic: credentials travel on this
		// connection, so a relay that will not start TLS is a failure
		// rather than a reason to continue in the clear.
		mail.WithTLSPolicy(mail.TLSMandatory),
		mail.WithTimeout(s.cfg.Timeout),
	)
	if err != nil {
		return fmt.Errorf("email: failed to build the SMTP client: %w", err)
	}

	if err := client.DialAndSendWithContext(ctx, m); err != nil {
		return fmt.Errorf("email: failed to send message %s: %w", msg.MessageID, err)
	}

	return nil
}

// buildMsg turns a Message into the go-mail message that carries it.
func (s *SMTPSender) buildMsg(msg Message) (*mail.Msg, error) {
	m := mail.NewMsg()

	if err := m.FromFormat(s.cfg.FromName, s.cfg.From); err != nil {
		return nil, fmt.Errorf("email: invalid from address %q: %w", s.cfg.From, err)
	}

	// A display name is optional; a bare address is a perfectly good
	// recipient and is what we have for anyone who never filled in a name.
	if msg.ToName != "" {
		if err := m.AddToFormat(msg.ToName, msg.To); err != nil {
			return nil, fmt.Errorf("email: invalid recipient %q: %w", msg.To, err)
		}
	} else if err := m.To(msg.To); err != nil {
		return nil, fmt.Errorf("email: invalid recipient %q: %w", msg.To, err)
	}

	m.Subject(msg.Subject)
	m.SetMessageIDWithValue(msg.MessageID)

	// Gmail threads consecutive mails to the same recipient by
	// X-Entity-Ref-ID: give two different mails the same value and they
	// collapse into one conversation. Setting it to the Message-ID makes
	// it unique per message, which is what keeps a password reset from
	// hiding underneath last week's verification mail.
	m.SetGenHeader("X-Entity-Ref-ID", msg.MessageID)

	// Plain text is the body and HTML is the alternative, in that order:
	// multipart/alternative is "last part wins" for clients that can
	// render it, so the richer part has to come second.
	m.SetBodyString(mail.TypeTextPlain, msg.Text)
	m.AddAlternativeString(mail.TypeTextHTML, msg.HTML)

	return m, nil
}
