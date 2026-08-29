package services

import (
	"math"
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
		// Pins the overflow fix: base<<(attempt-1) as a single int64 shift
		// wraps through negative for an attempt this large, and a naive
		// "delay <= 0" guard alone cannot tell that apart from a real
		// backoff computed a few attempts later. The cap is still the only
		// correct answer here.
		{attempt: 63, want: time.Hour},
		// EMAIL_MAX_ATTEMPTS has no upper bound, so nothing stops an
		// operator from setting it absurdly high -- attempt can reach any
		// int32 value. The loop has to cap it without ever overflowing,
		// not just for the values this queue is tuned for.
		{attempt: math.MaxInt32, want: time.Hour},
	}

	for _, tt := range tests {
		assert.Equal(t, tt.want, backoffFor(tt.attempt, base, maxDelay),
			"attempt %d", tt.attempt)
	}
}

// backoffFor takes base and maxDelay as parameters, so its contract has to
// hold for whatever it is given, not just the 60s/1h pair Tick calls it
// with today.
//
// (1<<20)+1 ns is not an arbitrary choice: it has one bit set far above
// another bit set near zero. Against a 24h cap, base<<(attempt-1) as a
// single int64 shift used to wrap through negative as the high bit passed
// the sign bit, then land back on the low bit alone as a small *positive*
// number once the high bit shifted out of the word entirely -- attempts 45
// through 47 are where that happened. Both guard clauses, "delay <= 0" and
// "delay > maxDelay", pass on a value that low, so the old implementation
// returned a plausible-looking backoff of a few hours instead of the cap,
// for a true value that is actually millennia away. This is the case that
// would have failed before the fix in email_watcher.go.
func TestBackoffFor_AnAdversarialBaseNeverEscapesTheCap(t *testing.T) {
	t.Parallel()

	const (
		base     = (1 << 20) + 1 // 1.048577ms
		maxDelay = 24 * time.Hour
	)

	for _, attempt := range []int32{45, 46, 47, 63, 127} {
		assert.Equal(t, maxDelay, backoffFor(attempt, base, maxDelay),
			"attempt %d", attempt)
	}
}
