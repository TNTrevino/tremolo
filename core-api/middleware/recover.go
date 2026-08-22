package middleware

import (
	"net/http"
	"runtime/debug"

	"sight-reading/httpx"
	"sight-reading/logger"
)

// Recover turns a panic in a handler into a 500 with a JSON body.
//
// net/http already stops a panicking handler from taking the process
// down, but it does so by dropping the connection, so the caller gets no
// answer at all. gin.Default() installed its own Recovery for exactly
// this reason; routes moving off gin need the replacement or they lose
// that answer.
//
// The panic value never reaches the client. It goes to the log with a
// stack trace, and the client gets the same body every other unexpected
// failure produces.
func Recover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			recovered := recover()
			if recovered == nil {
				return
			}

			logger.Error("panic in handler",
				"error", recovered,
				"method", r.Method,
				"path", r.URL.Path,
				"stack", string(debug.Stack()),
			)

			// A handler that panicked after writing its status leaves
			// nothing to correct; this call is then a no-op that net/http
			// reports as a superfluous WriteHeader. Handlers here write
			// once and return, so the usual case is a clean 500.
			httpx.JSON(w, http.StatusInternalServerError, httpx.M{"error": "Internal server error"})
		}()

		next.ServeHTTP(w, r)
	})
}
