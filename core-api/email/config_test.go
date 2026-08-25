package email

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// emailEnvVars is every variable ConfigFromEnv reads. Each subtest clears
// the lot and then sets only what it is testing, so one case cannot leak
// into the next.
var emailEnvVars = []string{
	"EMAIL_SMTP_HOST",
	"EMAIL_SMTP_PORT",
	"EMAIL_SMTP_USER",
	"EMAIL_SMTP_PASSWORD",
	"EMAIL_FROM",
	"EMAIL_FROM_NAME",
	"EMAIL_SEND_TIMEOUT_SECONDS",
}

// clearEmailEnv blanks every EMAIL_* variable for the duration of the test.
// ConfigFromEnv reads with os.Getenv, which cannot tell "unset" from
// "empty", so blanking is equivalent to unsetting here.
func clearEmailEnv(t *testing.T) {
	t.Helper()
	for _, name := range emailEnvVars {
		t.Setenv(name, "")
	}
}

func TestConfigFromEnv(t *testing.T) {
	tests := []struct {
		name         string
		env          map[string]string
		wantEnabled  bool
		wantHost     string
		wantPort     int
		wantFrom     string
		wantFromName string
		wantTimeout  time.Duration
	}{
		{
			name:         "everything unset leaves email disabled",
			env:          map[string]string{},
			wantEnabled:  false,
			wantPort:     587,
			wantFromName: "Tremolo",
			wantTimeout:  20 * time.Second,
		},
		{
			name: "a host without a from address is still disabled",
			env: map[string]string{
				"EMAIL_SMTP_HOST": "smtp.example.com",
			},
			wantEnabled:  false,
			wantHost:     "smtp.example.com",
			wantPort:     587,
			wantFromName: "Tremolo",
			wantTimeout:  20 * time.Second,
		},
		{
			name: "a from address without a host is still disabled",
			env: map[string]string{
				"EMAIL_FROM": "noreply@tremolonotes.com",
			},
			wantEnabled:  false,
			wantFrom:     "noreply@tremolonotes.com",
			wantPort:     587,
			wantFromName: "Tremolo",
			wantTimeout:  20 * time.Second,
		},
		{
			name: "a host and a from address together enable email",
			env: map[string]string{
				"EMAIL_SMTP_HOST": "smtp.example.com",
				"EMAIL_FROM":      "noreply@tremolonotes.com",
			},
			wantEnabled:  true,
			wantHost:     "smtp.example.com",
			wantPort:     587,
			wantFrom:     "noreply@tremolonotes.com",
			wantFromName: "Tremolo",
			wantTimeout:  20 * time.Second,
		},
		{
			name: "an explicit port is parsed",
			env: map[string]string{
				"EMAIL_SMTP_HOST": "smtp.example.com",
				"EMAIL_FROM":      "noreply@tremolonotes.com",
				"EMAIL_SMTP_PORT": "2525",
			},
			wantEnabled:  true,
			wantHost:     "smtp.example.com",
			wantPort:     2525,
			wantFrom:     "noreply@tremolonotes.com",
			wantFromName: "Tremolo",
			wantTimeout:  20 * time.Second,
		},
		{
			name: "a junk port falls back to 587",
			env: map[string]string{
				"EMAIL_SMTP_HOST": "smtp.example.com",
				"EMAIL_FROM":      "noreply@tremolonotes.com",
				"EMAIL_SMTP_PORT": "not-a-port",
			},
			wantEnabled:  true,
			wantHost:     "smtp.example.com",
			wantPort:     587,
			wantFrom:     "noreply@tremolonotes.com",
			wantFromName: "Tremolo",
			wantTimeout:  20 * time.Second,
		},
		{
			name: "an explicit from name and timeout are honoured",
			env: map[string]string{
				"EMAIL_SMTP_HOST":            "smtp.example.com",
				"EMAIL_FROM":                 "noreply@tremolonotes.com",
				"EMAIL_FROM_NAME":            "Tremolo Notes",
				"EMAIL_SEND_TIMEOUT_SECONDS": "45",
			},
			wantEnabled:  true,
			wantHost:     "smtp.example.com",
			wantPort:     587,
			wantFrom:     "noreply@tremolonotes.com",
			wantFromName: "Tremolo Notes",
			wantTimeout:  45 * time.Second,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clearEmailEnv(t)
			for name, value := range tt.env {
				t.Setenv(name, value)
			}

			cfg := ConfigFromEnv()

			assert.Equal(t, tt.wantEnabled, cfg.Enabled())
			assert.Equal(t, tt.wantHost, cfg.Host)
			assert.Equal(t, tt.wantPort, cfg.Port)
			assert.Equal(t, tt.wantFrom, cfg.From)
			assert.Equal(t, tt.wantFromName, cfg.FromName)
			assert.Equal(t, tt.wantTimeout, cfg.Timeout)
		})
	}
}

// A half-configured relay is the failure an operator actually hits, so the
// startup warning has to name which variable is missing rather than just
// saying email is off.
func TestConfigMissing_NamesTheEmptyRequiredVars(t *testing.T) {
	clearEmailEnv(t)

	cfg := ConfigFromEnv()

	assert.Equal(t, []string{"EMAIL_SMTP_HOST", "EMAIL_FROM"}, cfg.Missing())

	t.Setenv("EMAIL_SMTP_HOST", "smtp.example.com")
	assert.Equal(t, []string{"EMAIL_FROM"}, ConfigFromEnv().Missing())

	t.Setenv("EMAIL_FROM", "noreply@tremolonotes.com")
	assert.Empty(t, ConfigFromEnv().Missing())
}

func TestConfigAddr_JoinsHostAndPort(t *testing.T) {
	clearEmailEnv(t)
	t.Setenv("EMAIL_SMTP_HOST", "smtp.example.com")
	t.Setenv("EMAIL_SMTP_PORT", "2525")

	assert.Equal(t, "smtp.example.com:2525", ConfigFromEnv().Addr())
}
