package main

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"sight-reading/logger"

	"github.com/stretchr/testify/assert"
)

func TestMain(m *testing.M) {
	// RequestLog and Recover both log, and the package logger panics
	// while nil.
	logger.InitLogger()
	m.Run()
}

var testOrigins = []string{"http://localhost:5173"}

// A protected route must reject an anonymous caller rather than 404. The
// distinction matters: a 404 here would mean the route never registered,
// which is how a whole domain goes missing without anything failing
// loudly.
func TestNewServer_ProtectedRouteRejectsAnonymousCallers(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	NewServer(testOrigins, nil).ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/teachers", nil))

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}

// A public route must answer from the handler rather than the middleware.
func TestNewServer_PublicRouteAnswersFromTheHandler(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	// Health reports unhealthy with no database connection.
	NewServer(testOrigins, nil).ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health", nil))

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
	assert.Contains(t, w.Body.String(), "unhealthy")
}

func TestNewServer_UnknownPathIs404(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	NewServer(testOrigins, nil).ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/nope", nil))

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// CORS is wrapped around the whole router, not attached per route, so it
// has to apply to every route without any of them opting in.
func TestNewServer_AppliesCORS(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodGet, "/health", nil)
	r.Header.Set("Origin", "http://localhost:5173")
	w := httptest.NewRecorder()

	NewServer(testOrigins, nil).ServeHTTP(w, r)

	assert.Equal(t, "http://localhost:5173", w.Header().Get("Access-Control-Allow-Origin"))
}

func TestNewServer_RejectsAnUnlistedOrigin(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodGet, "/health", nil)
	r.Header.Set("Origin", "http://evil.example.com")
	w := httptest.NewRecorder()

	NewServer(testOrigins, nil).ServeHTTP(w, r)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestNewServer_AnswersAPreflight(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodOptions, "/api/auth/login", nil)
	r.Header.Set("Origin", "http://localhost:5173")
	r.Header.Set("Access-Control-Request-Method", http.MethodPost)
	w := httptest.NewRecorder()

	NewServer(testOrigins, nil).ServeHTTP(w, r)

	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.Equal(t, "GET,POST,PUT,PATCH,DELETE,OPTIONS", w.Header().Get("Access-Control-Allow-Methods"))
}

// Registering the full route set must not panic. A ServeMux panics at
// registration on a malformed or conflicting pattern, so building the
// real server is itself the assertion: a bad pattern fails here rather
// than silently never matching a request.
func TestNewServer_RegistersEveryRouteWithoutPanicking(t *testing.T) {
	t.Parallel()

	assert.NotPanics(t, func() {
		NewServer(testOrigins, nil)
	})
}

// allowedOrigins feeds the CORS allowlist, so a parsing slip here opens
// or closes the API to the wrong callers.
func TestAllowedOrigins(t *testing.T) {
	tests := map[string]struct {
		env  string
		want []string
	}{
		"unset falls back to the local frontend": {"", []string{"http://localhost:5173"}},
		"single origin":                          {"https://tremolonotes.com", []string{"https://tremolonotes.com"}},
		"trims whitespace":                       {" https://a.com , https://b.com ", []string{"https://a.com", "https://b.com"}},
		"drops empty entries":                    {"https://a.com,,https://b.com", []string{"https://a.com", "https://b.com"}},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			t.Setenv("ALLOWED_ORIGINS", tt.env)
			assert.Equal(t, tt.want, allowedOrigins())
		})
	}
}
