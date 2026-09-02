package email

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// The Message-ID is minted once at enqueue and reused on every retry, so a
// collision would let two different mails look like the same delivery to a
// receiving server. The domain has to be ours, or spam filters treat the
// header as forged.
func TestNewMessageID_IsUniqueAndUsesTheFromDomain(t *testing.T) {
	t.Parallel()

	const from = "noreply@tremolonotes.com"

	seen := make(map[string]struct{}, 100)
	for range 100 {
		id, err := NewMessageID(from)
		require.NoError(t, err)

		assert.True(t, strings.HasSuffix(id, "@tremolonotes.com"),
			"expected %q to end with the From address domain", id)

		// go-mail wraps the value in angle brackets itself; carrying our
		// own would produce "<<id>>".
		assert.NotContains(t, id, "<")
		assert.NotContains(t, id, ">")

		_, duplicate := seen[id]
		require.False(t, duplicate, "NewMessageID produced a duplicate: %q", id)
		seen[id] = struct{}{}
	}

	assert.Len(t, seen, 100)
}

func TestNewMessageID_RejectsAFromAddressWithoutADomain(t *testing.T) {
	t.Parallel()

	_, err := NewMessageID("noreply")
	assert.Error(t, err)
}
