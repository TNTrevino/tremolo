package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

// testOrigins is the shape main.go builds: an explicit list, no wildcard.
var testOrigins = []string{"http://localhost:5173", "https://tremolonotes.com"}

func corsTestHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/ping", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("pong"))
	})
	return CORS(testOrigins)(mux)
}

func serveCORS(h http.Handler, method, origin string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, "/ping", nil)
	r.Host = "api.tremolonotes.com"
	if origin != "" {
		r.Header.Set("Origin", origin)
	}
	if method == http.MethodOptions {
		r.Header.Set("Access-Control-Request-Method", http.MethodPost)
		r.Header.Set("Access-Control-Request-Headers", "Authorization")
	}

	w := httptest.NewRecorder()
	h.ServeHTTP(w, r)
	return w
}

// These are golden values, not invented ones: they encode the exact
// browser contract the deployed frontend depends on. They are asserted
// literally, so a diff here is a regression to investigate, not a value
// to update to match new output.
//
// One case is easy to "fix" by accident: the configured origins are
// lowercased, but the request's Origin is compared exactly as sent, so a
// mixed-case Origin is still a 403. That case is kept below.
func TestCORS_GoldenResponses(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		method  string
		origin  string
		status  int
		body    string
		headers map[string][]string
	}{
		"no origin passes through untouched": {
			method: http.MethodGet, origin: "",
			status: http.StatusOK, body: "pong",
			headers: map[string][]string{
				"Access-Control-Allow-Origin": nil,
				"Vary":                        nil,
			},
		},
		"allowed origin gets the echo and a Vary": {
			method: http.MethodGet, origin: "http://localhost:5173",
			status: http.StatusOK, body: "pong",
			headers: map[string][]string{
				"Access-Control-Allow-Origin": {"http://localhost:5173"},
				"Vary":                        {"Origin"},
				// Only a preflight carries these.
				"Access-Control-Allow-Methods": nil,
				"Access-Control-Max-Age":       nil,
			},
		},
		"credentials are never allowed": {
			method: http.MethodPost, origin: "https://tremolonotes.com",
			status: http.StatusOK, body: "pong",
			headers: map[string][]string{
				"Access-Control-Allow-Origin":      {"https://tremolonotes.com"},
				"Access-Control-Allow-Credentials": nil,
			},
		},
		"unlisted origin is a bare 403": {
			method: http.MethodGet, origin: "http://evil.example.com",
			status: http.StatusForbidden, body: "",
			headers: map[string][]string{
				"Access-Control-Allow-Origin": nil,
			},
		},
		"origin differing only in case is still a 403": {
			method: http.MethodGet, origin: "http://LOCALHOST:5173",
			status: http.StatusForbidden, body: "",
			headers: map[string][]string{
				"Access-Control-Allow-Origin": nil,
			},
		},
		"preflight answers 204 with the full set": {
			method: http.MethodOptions, origin: "http://localhost:5173",
			status: http.StatusNoContent, body: "",
			headers: map[string][]string{
				"Access-Control-Allow-Origin":  {"http://localhost:5173"},
				"Access-Control-Allow-Methods": {"GET,POST,PUT,PATCH,DELETE,OPTIONS"},
				"Access-Control-Allow-Headers": {"Origin,Content-Type,Accept,Authorization"},
				"Access-Control-Max-Age":       {"43200"},
				"Vary": {
					"Origin",
					"Access-Control-Request-Method",
					"Access-Control-Request-Headers",
				},
			},
		},
		"preflight from an unlisted origin is a 403": {
			method: http.MethodOptions, origin: "http://evil.example.com",
			status: http.StatusForbidden, body: "",
			headers: map[string][]string{
				"Access-Control-Allow-Methods": nil,
			},
		},
	}

	handler := corsTestHandler()

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			w := serveCORS(handler, tt.method, tt.origin)

			assert.Equal(t, tt.status, w.Code, "status")
			assert.Equal(t, tt.body, w.Body.String(), "body")
			for header, want := range tt.headers {
				assert.Equal(t, want, w.Header().Values(header), "header %s", header)
			}
		})
	}
}

// A request whose Origin is the service's own host is not cross-origin,
// and passes through with no CORS headers at all. A handler that instead
// answered 403 would break the deployed same-host setup.
func TestCORS_SameOriginPassesThroughUntouched(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodGet, "/ping", nil)
	r.Host = "api.tremolonotes.com"
	r.Header.Set("Origin", "https://api.tremolonotes.com")
	w := httptest.NewRecorder()

	corsTestHandler().ServeHTTP(w, r)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "pong", w.Body.String())
	assert.Empty(t, w.Header().Get("Access-Control-Allow-Origin"))
}

// The "*" entry has to keep working, because ALLOWED_ORIGINS is operator
// supplied and a deployment may well set it.
func TestCORS_WildcardAllowsEveryOrigin(t *testing.T) {
	t.Parallel()

	handler := CORS([]string{"*"})(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest(http.MethodGet, "/ping", nil)
	r.Header.Set("Origin", "http://anywhere.example.com")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "*", w.Header().Get("Access-Control-Allow-Origin"))
}

// A disallowed origin must never reach a handler, or the 403 would be
// decoration over a request that already ran.
func TestCORS_DisallowedOriginNeverReachesTheHandler(t *testing.T) {
	t.Parallel()

	ran := false
	handler := CORS(testOrigins)(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		ran = true
	}))

	r := httptest.NewRequest(http.MethodGet, "/ping", nil)
	r.Header.Set("Origin", "http://evil.example.com")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	assert.False(t, ran)
	assert.Equal(t, http.StatusForbidden, w.Code)
}
