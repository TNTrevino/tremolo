package middleware

import (
	"net/http"
	"time"

	"sight-reading/logger"
)

// statusRecorder remembers the status code a handler wrote, which
// http.ResponseWriter otherwise gives no way to read back.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (rec *statusRecorder) WriteHeader(status int) {
	rec.status = status
	rec.ResponseWriter.WriteHeader(status)
}

// Write covers a handler that writes a body without calling WriteHeader,
// which net/http treats as an implicit 200.
func (rec *statusRecorder) Write(b []byte) (int, error) {
	if rec.status == 0 {
		rec.status = http.StatusOK
	}
	return rec.ResponseWriter.Write(b)
}

// RequestLog writes one line per request through the service's structured
// logger.
//
// Every request must produce a log line, or the deployed service has no
// access log at all. The fields are structured rather than a fixed text
// layout, so they survive LOG_FORMAT=json.
func RequestLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		rec := &statusRecorder{ResponseWriter: w}

		next.ServeHTTP(rec, r)

		if rec.status == 0 {
			// The handler returned without writing anything; net/http
			// sends a 200 with an empty body.
			rec.status = http.StatusOK
		}

		logger.Info("request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", rec.status,
			"duration_ms", time.Since(started).Milliseconds(),
		)
	})
}
