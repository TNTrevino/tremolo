package generation

import (
	"testing"
)

func TestEntryTimeGeneration(t *testing.T) {
	entryTime := generateFakeEntryTimeLength()
	t.Log(entryTime)
}
