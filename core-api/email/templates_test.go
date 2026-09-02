package email

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Every template that ships in this part, with its data struct filled in.
// Templates whose files land in a later part are deliberately absent:
// Render only knows about pairs that exist, and a missing file would
// panic at package init rather than fail here.
func TestRender_EveryTemplatePairRenders(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		template string
		data     any
	}{
		{
			name:     "password reset",
			template: TemplatePasswordReset,
			data: PasswordResetData{
				FirstName: "Avery",
				ResetURL:  "https://tremolonotes.com/reset-password?token=abc123",
				ExpiresIn: "1 hour",
				AppName:   "Tremolo",
				AppURL:    "https://tremolonotes.com",
			},
		},
		{
			name:     "verify email",
			template: TemplateVerifyEmail,
			data: VerifyEmailData{
				FirstName: "Avery",
				VerifyURL: "https://tremolonotes.com/verify-email?token=abc123",
				ExpiresIn: "24 hours",
				AppName:   "Tremolo",
				AppURL:    "https://tremolonotes.com",
			},
		},
		{
			name:     "password reset google",
			template: TemplatePasswordResetGoogle,
			data: PasswordResetGoogleData{
				FirstName: "Avery",
				AppName:   "Tremolo",
				AppURL:    "https://tremolonotes.com",
			},
		},
		{
			name:     "email change",
			template: TemplateEmailChange,
			data: EmailChangeData{
				FirstName:  "Avery",
				ConfirmURL: "https://tremolonotes.com/confirm-email-change?token=abc123",
				NewEmail:   "avery.new@tremolonotes.com",
				ExpiresIn:  "1 hour",
				AppName:    "Tremolo",
				AppURL:     "https://tremolonotes.com",
			},
		},
		{
			name:     "email change alert",
			template: TemplateEmailChangeAlert,
			data: EmailChangeAlertData{
				FirstName: "Avery",
				NewEmail:  "avery.new@tremolonotes.com",
				AppName:   "Tremolo",
				AppURL:    "https://tremolonotes.com",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			html, text, err := Render(tt.template, tt.data)
			require.NoError(t, err)

			assert.NotEmpty(t, html)
			assert.NotEmpty(t, text)
			assert.Contains(t, html, "<html", "the HTML body must be a whole document, not a fragment")
			assert.NotContains(t, text, "<html", "the plain-text body must not carry markup")
		})
	}
}

func TestRender_UnknownTemplateIsAnError(t *testing.T) {
	t.Parallel()

	_, _, err := Render("no-such-template", PasswordResetData{})

	assert.Error(t, err)
}

// A first name is whatever the user typed at registration, so it reaches
// the template as untrusted input. html/template escapes it for us; this
// test is here so a future switch to text/template for the HTML body, or
// a stray template.HTML conversion, fails loudly.
func TestRender_EscapesUserSuppliedNames(t *testing.T) {
	t.Parallel()

	html, _, err := Render(TemplatePasswordReset, PasswordResetData{
		FirstName: "<script>alert('xss')</script>",
		ResetURL:  "https://tremolonotes.com/reset-password?token=abc123",
		ExpiresIn: "1 hour",
		AppName:   "Tremolo",
		AppURL:    "https://tremolonotes.com",
	})
	require.NoError(t, err)

	assert.NotContains(t, html, "<script>")
	assert.Contains(t, html, "&lt;script&gt;")
}

// The whole mail is worthless if the link does not survive escaping. The
// token is generated upstream and the URL is built with net/url, so what
// reaches the href must come out byte for byte.
func TestRender_LinkSurvivesTheURLContext(t *testing.T) {
	t.Parallel()

	const resetURL = "https://tremolonotes.com/reset-password?token=abc-_123"

	html, text, err := Render(TemplatePasswordReset, PasswordResetData{
		FirstName: "Avery",
		ResetURL:  resetURL,
		ExpiresIn: "1 hour",
		AppName:   "Tremolo",
		AppURL:    "https://tremolonotes.com",
	})
	require.NoError(t, err)

	assert.Contains(t, html, `href="`+resetURL+`"`)
	assert.Contains(t, text, resetURL)

	// The link belongs on its own line in the plain-text body: mail
	// clients that auto-link do it per line, and a URL buried mid
	// sentence gets its trailing punctuation swallowed into the link.
	assert.True(t, containsLine(text, resetURL),
		"expected the reset URL on a line of its own in the text body")
}

// containsLine reports whether body has want as a whole line.
func containsLine(body, want string) bool {
	for line := range strings.SplitSeq(body, "\n") {
		if strings.TrimSpace(line) == want {
			return true
		}
	}
	return false
}
