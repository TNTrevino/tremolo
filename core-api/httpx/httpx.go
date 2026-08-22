// Package httpx holds the small JSON request/response helpers the
// controllers share. It replaces the parts of gin.Context the handlers
// actually used: c.JSON and c.ShouldBindJSON.
//
// The wire format is deliberately identical to gin's. JSON writes the same
// Content-Type and the same json.Marshal bytes gin's render.WriteJSON
// wrote, so the migration off gin does not change a single response body.
package httpx

import (
	"encoding/json"
	"fmt"
	"net/http"

	"sight-reading/logger"
)

// contentTypeJSON is the exact Content-Type gin's c.JSON set. Keeping it
// byte-for-byte avoids a client noticing the swap.
const contentTypeJSON = "application/json; charset=utf-8"

// M is a JSON object literal. It is the drop-in replacement for gin.H, and
// exists so handler bodies read the same after the migration.
type M map[string]any

// JSON writes v as a JSON body with the given status code.
//
// Like gin's c.JSON it does not return an error: a handler has no useful
// recovery once it has decided on a response. An encoding failure is
// logged and downgraded to a 500, which is the same outcome gin produced
// (gin panicked into its recovery middleware; this is quieter).
//
// Call JSON at most once per request, and return immediately after.
func JSON(w http.ResponseWriter, status int, v any) {
	body, err := json.Marshal(v)
	if err != nil {
		logger.Error("failed to encode json response", "error", err)
		w.Header().Set("Content-Type", contentTypeJSON)
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"Internal server error"}`))
		return
	}

	w.Header().Set("Content-Type", contentTypeJSON)
	w.WriteHeader(status)
	_, _ = w.Write(body)
}

// NoContent writes a bare status code with no body, the way gin's
// c.AbortWithStatus did.
func NoContent(w http.ResponseWriter, status int) {
	w.WriteHeader(status)
}

// Decode reads a JSON request body into a fresh T.
//
// It replaces c.ShouldBindJSON. One difference matters: gin also ran the
// `binding:"required"` struct tags during the bind, and this does not.
// Two request shapes relied on that tag (the refresh-token body and the
// friend-request body); both check the field explicitly after decoding.
// Everything else validates in the service layer already.
func Decode[T any](r *http.Request) (T, error) {
	var v T
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		return v, fmt.Errorf("decode json body: %w", err)
	}
	return v, nil
}
