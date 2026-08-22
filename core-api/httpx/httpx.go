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
	"context"
	"encoding/json"
	"fmt"
	"maps"
	"net/http"
	"slices"
	"strings"

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

// Validator is a request body that can check itself.
//
// The method is named Valid rather than Validate because it does not
// return an error: it returns the problems it found, keyed by the JSON
// field name, so a caller can render them per field. An empty map means
// the body is valid.
//
// The ctx argument is unused by every rule today. It is here so a rule
// that needs the database -- a uniqueness check, a role lookup -- can be
// added without changing the interface and every implementation of it.
type Validator interface {
	Valid(ctx context.Context) (problems map[string]string)
}

// DecodeValid reads a JSON request body into a fresh T and runs its Valid
// method.
//
// The [T Validator] constraint is the point of this function existing
// separately from Decode: a request shape that forgets Valid fails the
// build here rather than skipping validation at runtime.
//
// The three return values separate the two failure modes a caller has to
// tell apart. A nil problems map with a non-nil error means the body did
// not parse. A non-empty problems map means it parsed and broke a rule.
func DecodeValid[T Validator](r *http.Request) (T, map[string]string, error) {
	var v T
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		return v, nil, fmt.Errorf("decode json body: %w", err)
	}
	if problems := v.Valid(r.Context()); len(problems) > 0 {
		return v, problems, fmt.Errorf("invalid %T: %d problems", v, len(problems))
	}
	return v, nil, nil
}

// ProblemsError renders a problems map as the single error string this
// API has always returned.
//
// The keys are sorted before joining. Go map iteration order is random,
// and a response body that reorders itself between two identical requests
// is not acceptable.
func ProblemsError(problems map[string]string) string {
	keys := slices.Sorted(maps.Keys(problems))
	out := make([]string, 0, len(keys))
	for _, k := range keys {
		out = append(out, problems[k])
	}
	return strings.Join(out, ", ")
}

// DecodeError writes the 400 for a failed DecodeValid.
//
// An empty problems map means the body did not parse, which gets the
// generic message: there are no fields to name.
func DecodeError(w http.ResponseWriter, problems map[string]string) {
	if len(problems) == 0 {
		JSON(w, http.StatusBadRequest, M{"error": "Invalid request body"})
		return
	}
	JSON(w, http.StatusBadRequest, M{"error": ProblemsError(problems)})
}
