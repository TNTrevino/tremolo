package middleware

import (
	"net/http"
	"strings"

	"sight-reading/httpx"
)

// The three preflight answers. They are constants because the values are
// fixed by the service, not by the request, and because they must keep
// matching what gin-contrib/cors sent for the config main.go passed it:
// the six methods, the four headers, and a 12 hour cache.
const (
	corsAllowMethods  = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
	corsAllowHeaders  = "Origin,Content-Type,Accept,Authorization"
	corsMaxAgeSeconds = "43200"
)

// CORS answers cross-origin requests for the origins in allowedOrigins.
// The list entry "*" allows every origin.
//
// This replaces gin-contrib/cors, and copies its decisions on purpose,
// including the ones a fresh implementation would not make:
//
//   - A request with no Origin header passes straight through.
//   - A request whose Origin is this service's own host passes through
//     untouched, because it is not really cross-origin.
//   - An Origin that is not on the list gets a bare 403 and never reaches
//     a handler. A stricter answer than most CORS middleware gives, but
//     the deployed frontend already depends on it.
//   - A preflight gets 204 and no body.
//
// The configured origins are lowercased, but the request's Origin is
// compared exactly as it was sent. That asymmetry is gin-contrib's, and
// keeping it matters: it means ALLOWED_ORIGINS is forgiving about case
// while the request is not, so a mixed-case Origin is still a 403.
func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	allowAll := false
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, origin := range allowedOrigins {
		origin = strings.ToLower(strings.TrimSpace(origin))
		if origin == "*" {
			allowAll = true
		}
		allowed[origin] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if origin == "" {
				// Not a CORS request.
				next.ServeHTTP(w, r)
				return
			}

			// Same-origin requests carry an Origin header too (fetch does
			// this); they need no CORS headers.
			if origin == "http://"+r.Host || origin == "https://"+r.Host {
				next.ServeHTTP(w, r)
				return
			}

			if !allowAll && !allowed[origin] {
				httpx.NoContent(w, http.StatusForbidden)
				return
			}

			header := w.Header()
			if r.Method == http.MethodOptions {
				header.Set("Access-Control-Allow-Methods", corsAllowMethods)
				header.Set("Access-Control-Allow-Headers", corsAllowHeaders)
				header.Set("Access-Control-Max-Age", corsMaxAgeSeconds)
			}

			// Vary tells a cache that the answer depends on these request
			// headers. Without it a shared cache can serve one origin's
			// response to another.
			header.Add("Vary", "Origin")
			if r.Method == http.MethodOptions {
				header.Add("Vary", "Access-Control-Request-Method")
				header.Add("Vary", "Access-Control-Request-Headers")
			}

			if allowAll {
				header.Set("Access-Control-Allow-Origin", "*")
			} else {
				header.Set("Access-Control-Allow-Origin", origin)
			}

			if r.Method == http.MethodOptions {
				httpx.NoContent(w, http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
