package email

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/wneessen/go-mail"
)

// testConfig is a Config that Enabled() accepts, so a test can change the
// one field it cares about without restating the rest.
func testConfig() Config {
	return Config{
		Host:     "smtp.example.com",
		Port:     587,
		Username: "tremolo",
		Password: "hunter2",
		From:     "noreply@tremolonotes.com",
		FromName: "Tremolo",
		Timeout:  20 * time.Second,
	}
}

// testMessage is a fully rendered Message, matching what Render hands the
// queue.
func testMessage() Message {
	return Message{
		To:        "student@example.com",
		ToName:    "Ada Lovelace",
		Subject:   "Reset your Tremolo password",
		HTML:      "<p>Reset your password</p>",
		Text:      "Reset your password",
		MessageID: "abc123.def456@tremolonotes.com",
		Template:  "password_reset",
	}
}

// The addresses are the part of a message a relay refuses outright, and
// the display name is optional on the recipient but not on the sender, so
// the two sides take different paths through buildMsg.
func TestBuildMsg_Addresses(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		from     string
		fromName string
		to       string
		toName   string
		wantFrom string
		wantTo   string
		wantErr  string
	}{
		{
			name:     "a named recipient keeps the display name",
			from:     "noreply@tremolonotes.com",
			fromName: "Tremolo",
			to:       "student@example.com",
			toName:   "Ada Lovelace",
			wantFrom: `"Tremolo" <noreply@tremolonotes.com>`,
			wantTo:   `"Ada Lovelace" <student@example.com>`,
		},
		{
			name:     "a recipient with no name is sent as a bare address",
			from:     "noreply@tremolonotes.com",
			fromName: "Tremolo",
			to:       "student@example.com",
			wantFrom: `"Tremolo" <noreply@tremolonotes.com>`,
			wantTo:   "<student@example.com>",
		},
		{
			name:     "an empty from name still yields a usable sender",
			from:     "noreply@tremolonotes.com",
			to:       "student@example.com",
			wantFrom: "<noreply@tremolonotes.com>",
			wantTo:   "<student@example.com>",
		},
		{
			name:     "a misconfigured from address is reported, not sent",
			from:     "noreply-at-tremolonotes.com",
			fromName: "Tremolo",
			to:       "student@example.com",
			wantErr:  `invalid from address "noreply-at-tremolonotes.com"`,
		},
		{
			name:     "a junk named recipient is reported",
			from:     "noreply@tremolonotes.com",
			fromName: "Tremolo",
			to:       "not-an-address",
			toName:   "Ada Lovelace",
			wantErr:  `invalid recipient "not-an-address"`,
		},
		{
			name:     "a junk bare recipient is reported too",
			from:     "noreply@tremolonotes.com",
			fromName: "Tremolo",
			to:       "not-an-address",
			wantErr:  `invalid recipient "not-an-address"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			cfg := testConfig()
			cfg.From = tt.from
			cfg.FromName = tt.fromName

			msg := testMessage()
			msg.To = tt.to
			msg.ToName = tt.toName

			m, err := NewSMTPSender(cfg).buildMsg(msg)

			if tt.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
				assert.Nil(t, m)
				return
			}

			require.NoError(t, err)
			require.NotNil(t, m)
			assert.Equal(t, []string{tt.wantFrom}, m.GetFromString())
			assert.Equal(t, []string{tt.wantTo}, m.GetToString())
		})
	}
}

// A recipient with a display name must not also arrive as a bare address:
// the named and unnamed paths are an either/or, and taking both would
// deliver the mail twice.
func TestBuildMsg_AddsTheRecipientOnce(t *testing.T) {
	t.Parallel()

	m, err := NewSMTPSender(testConfig()).buildMsg(testMessage())
	require.NoError(t, err)

	require.Len(t, m.GetTo(), 1)
	assert.Equal(t, "Ada Lovelace", m.GetTo()[0].Name)
	assert.Equal(t, "student@example.com", m.GetTo()[0].Address)

	require.Len(t, m.GetFrom(), 1)
	assert.Equal(t, "Tremolo", m.GetFrom()[0].Name)
	assert.Equal(t, "noreply@tremolonotes.com", m.GetFrom()[0].Address)
}

// The Message-ID is minted at enqueue and reused on every retry, so
// buildMsg has to pass the stored value through rather than let go-mail
// generate a fresh one. X-Entity-Ref-ID carries the same value: Gmail
// threads consecutive mails that share it, and a per-message value is
// what keeps a reset out of last week's verification thread.
func TestBuildMsg_Headers(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		subject   string
		messageID string
	}{
		{
			name:      "a password reset",
			subject:   "Reset your Tremolo password",
			messageID: "abc123.def456@tremolonotes.com",
		},
		{
			name:      "a verification mail keeps its own id",
			subject:   "Verify your email address",
			messageID: "999zzz.111aaa@tremolonotes.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			msg := testMessage()
			msg.Subject = tt.subject
			msg.MessageID = tt.messageID

			m, err := NewSMTPSender(testConfig()).buildMsg(msg)
			require.NoError(t, err)

			assert.Equal(t, []string{tt.subject}, m.GetGenHeader(mail.HeaderSubject))

			// go-mail adds the angle brackets; the stored value carries
			// none, so the header is the id wrapped exactly once.
			assert.Equal(t, "<"+tt.messageID+">", m.GetMessageID())
			assert.Equal(t, []string{tt.messageID},
				m.GetGenHeader(mail.Header("X-Entity-Ref-ID")))
		})
	}
}

// multipart/alternative is last-part-wins for a client that can render
// both, so the plain-text body has to be written first and the HTML added
// after it. Reversing the two would show plain text to everyone.
func TestBuildMsg_BodyPartsPutHTMLLast(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		html string
		text string
	}{
		{
			name: "a rendered pair",
			html: "<p>Reset your password</p>",
			text: "Reset your password",
		},
		{
			name: "a multi-line plain-text body is carried verbatim",
			html: "<p>Hello</p><p>Goodbye</p>",
			text: "Hello\n\nGoodbye",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			msg := testMessage()
			msg.HTML = tt.html
			msg.Text = tt.text

			m, err := NewSMTPSender(testConfig()).buildMsg(msg)
			require.NoError(t, err)

			parts := m.GetParts()
			require.Len(t, parts, 2)

			assert.Equal(t, mail.TypeTextPlain, parts[0].GetContentType())
			text, err := parts[0].GetContent()
			require.NoError(t, err)
			assert.Equal(t, tt.text, string(text))

			assert.Equal(t, mail.TypeTextHTML, parts[1].GetContentType())
			html, err := parts[1].GetContent()
			require.NoError(t, err)
			assert.Equal(t, tt.html, string(html))
		})
	}
}

// Send must not open a connection when there is no relay to open it to.
// The watcher reads ErrNotConfigured as "do not burn a delivery attempt",
// so this is the one branch of Send that a unit test can reach without a
// network.
func TestSend_WithoutAConfiguredRelay(t *testing.T) {
	t.Parallel()

	cfg := testConfig()
	cfg.Host = ""

	err := NewSMTPSender(cfg).Send(t.Context(), testMessage())

	assert.ErrorIs(t, err, ErrNotConfigured)
}
