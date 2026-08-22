package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// testOrigins is the shape main.go builds: an explicit list, no wildcard.
var testOrigins = []string{"http://localhost:5173", "https://tremolonotes.com"}

// ginCORSHandler builds the exact middleware main.go used before this
// package existed, so the two can be compared request by request.
func ginCORSHandler() http.Handler {
	gin.SetMode(gin.TestMode)
	router := gin.New()

	config := cors.DefaultConfig()
	config.AllowOrigins = testOrigins
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	router.Use(cors.New(config))

	router.Any("/ping", func(c *gin.Context) {
		c.String(http.StatusOK, "pong")
	})
	return router
}

// stdlibCORSHandler is the replacement, wrapped around a handler that
// answers /ping the same way.
func stdlibCORSHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/ping", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("pong"))
	})
	return CORS(testOrigins)(mux)
}

// CORS is the one piece of this migration a unit test cannot judge on its
// own: "correct" means "whatever the browser already accepts". So the two
// implementations answer the same requests and the answers are compared.
// Delete this test with the gin dependency.
func TestCORS_MatchesGinContribCors(t *testing.T) {
	t.Parallel()

	requests := map[string]struct {
		method string
		origin string
	}{
		"no origin":                {http.MethodGet, ""},
		"allowed origin":           {http.MethodGet, "http://localhost:5173"},
		"allowed origin, post":     {http.MethodPost, "https://tremolonotes.com"},
		"disallowed origin":        {http.MethodGet, "http://evil.example.com"},
		"preflight, allowed":       {http.MethodOptions, "http://localhost:5173"},
		"preflight, disallowed":    {http.MethodOptions, "http://evil.example.com"},
		"origin differing in case": {http.MethodGet, "http://LOCALHOST:5173"},
	}

	compared := []string{
		"Access-Control-Allow-Origin",
		"Access-Control-Allow-Methods",
		"Access-Control-Allow-Headers",
		"Access-Control-Max-Age",
		"Access-Control-Allow-Credentials",
		"Vary",
	}

	ginHandler := ginCORSHandler()
	stdHandler := stdlibCORSHandler()

	for name, req := range requests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			ginResp := serveCORS(ginHandler, req.method, req.origin)
			stdResp := serveCORS(stdHandler, req.method, req.origin)

			assert.Equal(t, ginResp.Code, stdResp.Code, "status code")
			assert.Equal(t, ginResp.Body.String(), stdResp.Body.String(), "body")
			for _, header := range compared {
				assert.Equal(t,
					ginResp.Header().Values(header),
					stdResp.Header().Values(header),
					"header %s", header)
			}
		})
	}
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

// A request whose Origin is the service's own host is not cross-origin,
// and gin-contrib let it through with no CORS headers at all. A handler
// that instead answered 403 would break the deployed same-host setup.
func TestCORS_SameOriginPassesThroughUntouched(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodGet, "/ping", nil)
	r.Host = "api.tremolonotes.com"
	r.Header.Set("Origin", "https://api.tremolonotes.com")
	w := httptest.NewRecorder()

	stdlibCORSHandler().ServeHTTP(w, r)

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
