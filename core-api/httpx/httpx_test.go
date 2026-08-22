package httpx_test

import (
	"context"
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

// validBody is a request shape whose Valid method fails on an empty Name.
// It exists only to exercise DecodeValid.
type validBody struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}

func (b validBody) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}
	if b.Name == "" {
		problems["name"] = "Name: is required"
	}
	if b.Age < 0 {
		problems["age"] = "Age: must not be negative"
	}
	return problems
}

func TestDecodeValid_PassesAValidBody(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"tremolo","age":3}`))
	got, problems, err := httpx.DecodeValid[validBody](r)

	require.NoError(t, err)
	assert.Empty(t, problems)
	assert.Equal(t, "tremolo", got.Name)
}

// A body that parses but breaks a rule must come back with the problems
// map, because the caller renders it into the response.
func TestDecodeValid_ReturnsProblems(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"","age":-1}`))
	_, problems, err := httpx.DecodeValid[validBody](r)

	require.Error(t, err)
	assert.Equal(t, map[string]string{
		"name": "Name: is required",
		"age":  "Age: must not be negative",
	}, problems)
}

// A body that does not parse must produce a nil problems map, because
// DecodeError uses an empty map to mean "the body did not parse".
func TestDecodeValid_MalformedBodyHasNoProblems(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":`))
	_, problems, err := httpx.DecodeValid[validBody](r)

	require.Error(t, err)
	assert.Nil(t, problems)
}

// A JSON body of `null` decodes into the zero value rather than failing,
// so Valid still runs and reports the missing field. This is why Valid
// uses a value receiver: a pointer receiver would panic here.
func TestDecodeValid_NullBodyIsValidated(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`null`))
	_, problems, err := httpx.DecodeValid[validBody](r)

	require.Error(t, err)
	assert.Equal(t, "Name: is required", problems["name"])
}

// Go map order is random. Two identical requests must not produce two
// different response bodies, so the keys are sorted.
func TestProblemsError_SortsByKey(t *testing.T) {
	t.Parallel()

	got := httpx.ProblemsError(map[string]string{
		"zebra": "Zebra: bad",
		"apple": "Apple: bad",
		"mango": "Mango: bad",
	})

	assert.Equal(t, "Apple: bad, Mango: bad, Zebra: bad", got)
}

func TestProblemsError_EmptyMapIsEmptyString(t *testing.T) {
	t.Parallel()

	assert.Equal(t, "", httpx.ProblemsError(map[string]string{}))
}

func TestDecodeError_RendersProblems(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	httpx.DecodeError(w, map[string]string{"name": "Name: is required"})

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.JSONEq(t, `{"error":"Name: is required"}`, w.Body.String())
}

func TestDecodeError_EmptyProblemsMeansBadBody(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	httpx.DecodeError(w, nil)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.JSONEq(t, `{"error":"Invalid request body"}`, w.Body.String())
}
