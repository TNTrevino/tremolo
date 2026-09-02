// Package testutil provides test utilities for HTTP request/response handling
package testutil

import (
	"encoding/json"
	"net/http/httptest"
	"sync"
	"testing"

	"sight-reading/logger"

	"github.com/stretchr/testify/require"
)

var initLoggerOnce sync.Once

// initTestLogger initializes the logger for tests (idempotent). The
// package logger is nil until this runs, and any handler that logs
// panics on a nil logger. SetupTestDB calls it.
func initTestLogger() {
	initLoggerOnce.Do(func() {
		logger.InitLogger()
	})
}

// ParseJSONResponse parses the JSON response body into the given struct.
func ParseJSONResponse(t *testing.T, w *httptest.ResponseRecorder, v any) {
	t.Helper()
	err := json.Unmarshal(w.Body.Bytes(), v)
	require.NoError(t, err, "Failed to parse JSON response: %s", w.Body.String())
}
