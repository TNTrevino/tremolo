package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"sight-reading/logger"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMain(m *testing.M) {
	logger.InitLogger()
	// GenerateAccessToken and GenerateRefreshToken read these, and
	// getEnvInt panics when they are missing.
	if os.Getenv("JWT_SECRET") == "" {
		mustSetenv("JWT_SECRET", "middleware-test-secret-at-least-32-characters")
	}
	mustSetenv("ACCESS_TOKEN_EXPIRY_MINUTES", "15")
	mustSetenv("REFRESH_TOKEN_EXPIRY_HOURS", "168")
	InitJWTSecret()
	os.Exit(m.Run())
}

// mustSetenv fails the whole package rather than running the token tests
// against a half-configured environment. t.Setenv is unavailable here:
// TestMain has no *testing.T, and InitJWTSecret reads these once.
func mustSetenv(key, value string) {
	if err := os.Setenv(key, value); err != nil {
		panic(err)
	}
}

// okHandler records that it ran and echoes back the user ID the middleware
// put on the request.
func okHandler(t *testing.T, ran *bool) http.Handler {
	t.Helper()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		*ran = true
		userID, err := AuthenticatedUserID(r)
		require.NoError(t, err)
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(http.StatusText(http.StatusOK)))
		assert.Positive(t, userID)
	})
}

func TestRequireAuth_ValidAccessTokenReachesTheHandler(t *testing.T) {
	token, err := GenerateAccessToken(42)
	require.NoError(t, err)

	ran := false
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()

	RequireAuth(okHandler(t, &ran)).ServeHTTP(w, r)

	assert.True(t, ran, "handler should have run")
	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRequireAuth_UserIDReachesTheHandler(t *testing.T) {
	token, err := GenerateAccessToken(4242)
	require.NoError(t, err)

	var seen int
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	r.Header.Set("Authorization", "Bearer "+token)

	RequireAuth(http.HandlerFunc(func(_ http.ResponseWriter, r *http.Request) {
		seen, _ = AuthenticatedUserID(r)
	})).ServeHTTP(httptest.NewRecorder(), r)

	assert.Equal(t, 4242, seen)
}

// Every rejection has to answer with the same body the gin middleware
// sent, because the frontend's refresh interceptor branches on the 401.
func TestRequireAuth_RejectionsMatchTheGinBodies(t *testing.T) {
	refreshToken, err := GenerateRefreshToken(1)
	require.NoError(t, err)

	tests := map[string]struct {
		header string
		body   string
	}{
		"no header":         {"", `{"error":"Unauthorized"}`},
		"not bearer":        {"Token abc", `{"error":"Unauthorized"}`},
		"missing token":     {"Bearer", `{"error":"Unauthorized"}`},
		"garbage token":     {"Bearer not-a-jwt", `{"error":"Unauthorized"}`},
		"refresh not acces": {"Bearer " + refreshToken, `{"error":"Invalid token type"}`},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			ran := false
			r := httptest.NewRequest(http.MethodGet, "/", nil)
			if tt.header != "" {
				r.Header.Set("Authorization", tt.header)
			}
			w := httptest.NewRecorder()

			RequireAuth(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
				ran = true
			})).ServeHTTP(w, r)

			assert.False(t, ran, "handler must not run")
			assert.Equal(t, http.StatusUnauthorized, w.Code)
			assert.JSONEq(t, tt.body, w.Body.String())
		})
	}
}

// A handler that loses its middleware must fail closed rather than read
// the zero value as user 0.
func TestAuthenticatedUserID_WithoutMiddlewareErrors(t *testing.T) {
	t.Parallel()

	_, err := AuthenticatedUserID(httptest.NewRequest(http.MethodGet, "/", nil))

	assert.Error(t, err)
}
