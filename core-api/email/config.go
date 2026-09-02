package email

import (
	"net"
	"os"
	"strconv"
	"time"
)

// Defaults for the optional EMAIL_* settings. Every one of these is a
// value the service can run on unchanged; only the host and the from
// address have no sensible default, and their absence turns email off.
const (
	defaultPort        = 587
	defaultFromName    = "Tremolo"
	defaultSendTimeout = 20 * time.Second
)

// Config is the SMTP relay configuration.
//
// It is read from the environment with defaults for everything optional,
// so a developer with no EMAIL_* variables set still gets a valid Config —
// one that reports Enabled() == false.
type Config struct {
	// Host is the relay hostname. Empty means email is disabled.
	Host string
	// Port is the relay port; 587 (submission, STARTTLS) by default.
	Port int
	// Username and Password are the SMTP AUTH PLAIN credentials.
	Username string
	Password string
	// From is the envelope and header From address. Empty means email is
	// disabled.
	From string
	// FromName is the display name shown beside From.
	FromName string
	// Timeout bounds a single dial-and-send.
	Timeout time.Duration
}

// ConfigFromEnv reads the EMAIL_* variables.
//
// Nothing here fails: a missing or unparseable value falls back to its
// default, and a missing host or from address simply leaves the Config
// disabled. The service must boot with no email configuration at all —
// that is what keeps a local checkout and the CI smoke test working.
func ConfigFromEnv() Config {
	return Config{
		Host:     os.Getenv("EMAIL_SMTP_HOST"),
		Port:     envInt("EMAIL_SMTP_PORT", defaultPort),
		Username: os.Getenv("EMAIL_SMTP_USER"),
		Password: os.Getenv("EMAIL_SMTP_PASSWORD"),
		From:     os.Getenv("EMAIL_FROM"),
		FromName: envString("EMAIL_FROM_NAME", defaultFromName),
		Timeout:  time.Duration(envInt("EMAIL_SEND_TIMEOUT_SECONDS", int(defaultSendTimeout.Seconds()))) * time.Second,
	}
}

// Enabled reports whether there is enough configuration to deliver mail.
// Both a relay and a sender address are required: a relay with no From is
// rejected by every submission server, and a From with no relay has
// nowhere to go.
func (c Config) Enabled() bool {
	return c.Host != "" && c.From != ""
}

// Missing names the required variables that are empty, in the order an
// operator would set them. It exists so the startup warning can say what
// to fix instead of only that email is off.
func (c Config) Missing() []string {
	missing := make([]string, 0, 2)
	if c.Host == "" {
		missing = append(missing, "EMAIL_SMTP_HOST")
	}
	if c.From == "" {
		missing = append(missing, "EMAIL_FROM")
	}
	return missing
}

// Addr is the host:port the sender dials.
func (c Config) Addr() string {
	return net.JoinHostPort(c.Host, strconv.Itoa(c.Port))
}

// envString returns the variable's value, or fallback when it is unset or
// empty.
func envString(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}

// envInt parses the variable as an int, falling back on anything that is
// not a positive number. A typo in a port number should not stop the
// service from booting.
func envInt(name string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(name))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}
