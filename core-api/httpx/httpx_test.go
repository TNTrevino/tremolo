package httpx_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"sight-reading/httpx"
	"sight-reading/logger"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMain(m *testing.M) {
	// JSON logs through the package logger on the encode-failure path, and
	// that logger panics while nil.
	logger.InitLogger()
	m.Run()
}

// The response format is fixed byte-for-byte, so the header and the body
// are both asserted exactly.
func TestJSON_WireFormatIsExact(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	httpx.JSON(w, http.StatusCreated, httpx.M{"status": "ok"})

	assert.Equal(t, http.StatusCreated, w.Code)
	assert.Equal(t, "application/json; charset=utf-8", w.Header().Get("Content-Type"))
	// No trailing newline: JSON uses json.Marshal, not a json.Encoder.
	assert.Equal(t, `{"status":"ok"}`, w.Body.String())
}

// An unencodable value must not leave the client with a 200 and a partial
// body, which is what a naive json.Encoder write would produce.
func TestJSON_EncodeFailureBecomesA500(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	httpx.JSON(w, http.StatusOK, httpx.M{"bad": make(chan int)})

	assert.Equal(t, http.StatusInternalServerError, w.Code)
	assert.JSONEq(t, `{"error":"Internal server error"}`, w.Body.String())
}

func TestNoContent_WritesStatusOnly(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	httpx.NoContent(w, http.StatusNoContent)

	assert.Equal(t, http.StatusNoContent, w.Code)
	assert.Empty(t, w.Body.String())
}

func TestDecode_ReadsTheBody(t *testing.T) {
	t.Parallel()

	type body struct {
		Name string `json:"name"`
	}

	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"tremolo"}`))
	got, err := httpx.Decode[body](r)

	require.NoError(t, err)
	assert.Equal(t, "tremolo", got.Name)
}

// Malformed and empty bodies both have to fail, because every caller maps
// a Decode error onto a 400 or a 422.
func TestDecode_RejectsBadBodies(t *testing.T) {
	t.Parallel()

	type body struct {
		Name string `json:"name"`
	}

	for name, raw := range map[string]string{
		"malformed": `{"name":`,
		"empty":     ``,
	} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(raw))
			_, err := httpx.Decode[body](r)
			assert.Error(t, err)
		})
	}
}

// Unknown fields are ignored deliberately: rejecting them would turn
// requests the API accepts today into 400s.
func TestDecode_IgnoresUnknownFields(t *testing.T) {
	t.Parallel()

	type body struct {
		Name string `json:"name"`
	}

	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"a","extra":1}`))
	got, err := httpx.Decode[body](r)

	require.NoError(t, err)
	assert.Equal(t, "a", got.Name)
}

// M has to marshal as a plain JSON object.
func TestM_MarshalsAsAnObject(t *testing.T) {
	t.Parallel()

	raw, err := json.Marshal(httpx.M{"error": "Unauthorized"})

	require.NoError(t, err)
	assert.Equal(t, `{"error":"Unauthorized"}`, string(raw))
}
