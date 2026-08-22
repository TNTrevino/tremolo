// Package httpx holds the small JSON request/response helpers the
// controllers share: writing a JSON response and decoding a JSON request
// body.
//
// The wire format is fixed: JSON writes a single json.Marshal-produced
// body with a fixed Content-Type and no trailing newline. Deployed
// clients and the test suite both depend on that exact format, so it
// must not drift.
package httpx

import (
	"encoding/json"
	"fmt"
	"net/http"

	"sight-reading/logger"
)

// contentTypeJSON is the exact Content-Type value clients receive today.
// Keep it byte-for-byte: the frontend and the tests both depend on it.
const contentTypeJSON = "application/json; charset=utf-8"

// M is a JSON object literal, used for ad-hoc response bodies that don't
// warrant a named type.
type M map[string]any

// JSON writes v as a JSON body with the given status code.
//
// JSON does not return an error: a handler has no useful recovery once
// it has decided on a response. An encoding failure is logged and
// downgraded to a 500 rather than left to panic.
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

// NoContent writes a bare status code with no body.
func NoContent(w http.ResponseWriter, status int) {
	w.WriteHeader(status)
}

// Decode reads a JSON request body into a fresh T.
//
// Decode does not enforce struct-tag validation (e.g. a "required"
// field) during the decode; only field presence and JSON syntax are
// checked. Two request shapes need a required field (the refresh-token
// body and the friend-request body); both check the field explicitly
// after decoding. Everything else validates in the service layer
// already.
func Decode[T any](r *http.Request) (T, error) {
	var v T
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		return v, fmt.Errorf("decode json body: %w", err)
	}
	return v, nil
}
