// Package testutil provides test utilities for HTTP request/response handling
package testutil

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sight-reading/logger"
	"sync"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
)

var initLoggerOnce sync.Once

func init() {
	gin.SetMode(gin.TestMode)
}

// initTestLogger initializes the logger for tests (idempotent)
func initTestLogger() {
	initLoggerOnce.Do(func() {
		logger.InitLogger()
	})
}

// CreateGinContext creates a gin context with an HTTP request for testing.
// The method defaults to GET if empty.
func CreateGinContext(method, path string) (*gin.Context, *httptest.ResponseRecorder) {
	initTestLogger()

	if method == "" {
		method = http.MethodGet
	}
	if path == "" {
		path = "/"
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(method, path, nil)
	return c, w
}

// CreateGinContextWithBody creates a gin context with a JSON request body.
func CreateGinContextWithBody(method, path string, body interface{}) (*gin.Context, *httptest.ResponseRecorder) {
	if method == "" {
		method = http.MethodPost
	}
	if path == "" {
		path = "/"
	}

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	if body != nil {
		jsonBody, _ := json.Marshal(body)
		c.Request = httptest.NewRequest(method, path, bytes.NewBuffer(jsonBody))
		c.Request.Header.Set("Content-Type", "application/json")
	} else {
		c.Request = httptest.NewRequest(method, path, nil)
	}

	return c, w
}

// CreateGinContextWithParams creates a gin context with URL parameters.
func CreateGinContextWithParams(method, path string, params gin.Params) (*gin.Context, *httptest.ResponseRecorder) {
	c, w := CreateGinContext(method, path)
	c.Params = params
	return c, w
}

// CreateGinContextWithUserID creates a gin context with the userID set in context.
// This simulates an authenticated request where auth middleware has set the userID.
func CreateGinContextWithUserID(method, path string, userID int) (*gin.Context, *httptest.ResponseRecorder) {
	c, w := CreateGinContext(method, path)
	c.Set("userID", userID)
	return c, w
}

// ParseJSONResponse parses the JSON response body into the given struct.
func ParseJSONResponse(t *testing.T, w *httptest.ResponseRecorder, v interface{}) {
	t.Helper()
	err := json.Unmarshal(w.Body.Bytes(), v)
	require.NoError(t, err, "Failed to parse JSON response: %s", w.Body.String())
}
