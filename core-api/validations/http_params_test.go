package validations

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func requestWithQuery(query string) *http.Request {
	return httptest.NewRequest(http.MethodGet, "/?"+query, nil)
}

func TestQueryInt(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		query   string
		want    int
		wantErr bool
	}{
		"reads the value":             {"days=7", 7, false},
		"falls back when missing":     {"", 30, false},
		"falls back when empty":       {"days=", 30, false},
		"rejects a non number":        {"days=lots", 0, true},
		"rejects below the minimum":   {"days=0", 0, true},
		"rejects a negative":          {"days=-5", 0, true},
		"accepts exactly the minimum": {"days=1", 1, false},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			got, err := QueryInt(requestWithQuery(tt.query), "days", 30, 1)

			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestChartInterval(t *testing.T) {
	t.Parallel()

	tests := map[string]struct {
		query   string
		want    string
		wantErr bool
	}{
		"defaults to day":  {"", "day", false},
		"reads week":       {"interval=week", "week", false},
		"rejects nonsense": {"interval=fortnight", "", true},
	}

	for name, tt := range tests {
		t.Run(name, func(t *testing.T) {
			t.Parallel()

			got, err := ChartInterval(requestWithQuery(tt.query))

			if tt.wantErr {
				assert.Error(t, err)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestChartDays_DefaultsTo30(t *testing.T) {
	t.Parallel()

	got, err := ChartDays(requestWithQuery(""))

	require.NoError(t, err)
	assert.Equal(t, 30, got)
}
