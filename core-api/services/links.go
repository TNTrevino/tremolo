package services

import (
	"os"
	"strings"
)

// defaultPublicBaseURL is the Angular dev server.
const defaultPublicBaseURL = "http://localhost:4200"

// PublicBaseURL is the origin the frontend is served from, and the base
// every link in an outbound email is built on. Trailing slashes are
// trimmed so callers can join paths without producing "//".
//
// It is read from PUBLIC_BASE_URL and deliberately NOT derived from
// ALLOWED_ORIGINS. That list is a CORS allowlist: it holds production and
// QA together, in no meaningful order, and its own fallback is a port the
// React app used to serve on. Picking one entry out of it would mean
// guessing which host a given reader's reset link should point at, and
// getting that wrong sends a working link to the wrong deployment.
func PublicBaseURL() string {
	raw := strings.TrimSpace(os.Getenv("PUBLIC_BASE_URL"))
	if raw == "" {
		return defaultPublicBaseURL
	}
	return strings.TrimRight(raw, "/")
}
