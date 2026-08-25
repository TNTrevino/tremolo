package services

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// backoffFor is unexported and needs no database, so its test lives beside
// it rather than in tests/, the same way the chart strategies' does.
func TestBackoffFor(t *testing.T) {
	t.Parallel()

	const (
		base     = 60 * time.Second
		maxDelay = time.Hour
	)

	tests := []struct {
		attempt int32
		want    time.Duration
	}{
		{attempt: 1, want: 60 * time.Second},
		{attempt: 2, want: 120 * time.Second},
		{attempt: 3, want: 240 * time.Second},
		{attempt: 4, want: 480 * time.Second},
		// Doubling would put this at over eight hours; the cap is what
		// keeps a dead relay from parking a message until tomorrow.
		{attempt: 10, want: time.Hour},
	}

	for _, tt := range tests {
		assert.Equal(t, tt.want, backoffFor(tt.attempt, base, maxDelay),
			"attempt %d", tt.attempt)
	}
}
