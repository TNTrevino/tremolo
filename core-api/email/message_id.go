package email

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

// NewMessageID mints an RFC 5322 Message-ID value of the form
//
//	<32 hex chars>.<unix nanoseconds>@<domain of the From address>
//
// returned WITHOUT the surrounding angle brackets, because go-mail adds
// those itself in SetMessageIDWithValue.
//
// The domain is taken from the From address rather than the machine's
// hostname so the identifier is plausibly ours: receiving servers and spam
// filters treat a Message-ID whose domain does not match the sender as a
// weak forgery signal.
//
// The value is minted once, at enqueue, and stored on the row. Every retry
// of that row sends the same identifier, so a relay that already accepted
// the mail before timing out on us can recognise the redelivery instead of
// treating it as a second, different message.
func NewMessageID(fromAddr string) (string, error) {
	at := strings.LastIndex(fromAddr, "@")
	if at < 0 || at == len(fromAddr)-1 {
		return "", fmt.Errorf("email: cannot build a Message-ID from %q: no domain", fromAddr)
	}
	domain := fromAddr[at+1:]

	random := make([]byte, 16)
	if _, err := rand.Read(random); err != nil {
		return "", fmt.Errorf("email: failed to generate a Message-ID: %w", err)
	}

	return fmt.Sprintf("%s.%d@%s", hex.EncodeToString(random), time.Now().UnixNano(), domain), nil
}
