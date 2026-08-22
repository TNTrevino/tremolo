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

// The mounted gin engine has to keep answering every route that has not
// converted yet, or the migration breaks the service between commits.
func TestNewServer_UnconvertedRoutesStillReachGin(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	// /health lives on the gin side and reports unhealthy without a
	// database connection, which is enough to prove the request arrived.
	NewServer(testOrigins).ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/health", nil))

	assert.Equal(t, http.StatusServiceUnavailable, w.Code)
	assert.Contains(t, w.Body.String(), "unhealthy")
}

func TestNewServer_UnknownPathIs404(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	NewServer(testOrigins).ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/nope", nil))

	assert.Equal(t, http.StatusNotFound, w.Code)
}

// CORS sits above the router, so it must apply to gin-served routes and
// converted ones alike.
func TestNewServer_AppliesCORS(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodGet, "/health", nil)
	r.Header.Set("Origin", "http://localhost:5173")
	w := httptest.NewRecorder()

	NewServer(testOrigins).ServeHTTP(w, r)

	assert.Equal(t, "http://localhost:5173", w.Header().Get("Access-Control-Allow-Origin"))
}

func TestNewServer_RejectsAnUnlistedOrigin(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodGet, "/health", nil)
	r.Header.Set("Origin", "http://evil.example.com")
	w := httptest.NewRecorder()

	NewServer(testOrigins).ServeHTTP(w, r)

	assert.Equal(t, http.StatusForbidden, w.Code)
}

func TestNewServer_AnswersAPreflight(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodOptions, "/api/auth/login", nil)
	r.Header.Set("Origin", "http://localhost:5173")
	r.Header.Set("Access-Control-Request-Method", http.MethodPost)
	w := httptest.NewRecorder()

	NewServer(testOrigins).ServeHTTP(w, r)

	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.Equal(t, "GET,POST,PUT,PATCH,DELETE,OPTIONS", w.Header().Get("Access-Control-Allow-Methods"))
}

// A converted route must win over the gin catch-all, whatever order they
// register in. This is the assumption the whole staged migration rests
// on, so it is asserted rather than trusted.
func TestNewServer_SpecificPatternBeatsTheGinCatchAll(t *testing.T) {
	t.Parallel()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /converted", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTeapot)
	})
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	})

	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/converted", nil))

	assert.Equal(t, http.StatusTeapot, w.Code)
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
