package testutil

import (
	"context"
	"slices"
	"sync"

	"sight-reading/email"
)

// FakeSender stands in for the SMTP sender in tests. It records every
// message it is handed and, optionally, decides the outcome.
//
// It mirrors MockGoogleTokenVerifier: the production dependency is an
// interface, and a test wires this in its place rather than reaching for
// a network.
type FakeSender struct {
	mu sync.Mutex

	// Sent is every message handed to Send, in order. Safe to read once
	// the code under test has returned.
	Sent []email.Message

	// SendFn decides what Send returns. Nil means every send succeeds.
	// The message is recorded either way, so a failing sender still
	// shows what it was asked to deliver -- which is how the retry tests
	// check that the Message-ID does not change.
	SendFn func(ctx context.Context, msg email.Message) error
}

var _ email.Sender = (*FakeSender)(nil)

// NewFakeSender returns a sender that accepts everything.
func NewFakeSender() *FakeSender {
	return &FakeSender{}
}

// NewFailingSender returns a sender that records every message and then
// fails with err.
func NewFailingSender(err error) *FakeSender {
	return &FakeSender{
		SendFn: func(context.Context, email.Message) error {
			return err
		},
	}
}

func (f *FakeSender) Send(ctx context.Context, msg email.Message) error {
	f.mu.Lock()
	f.Sent = append(f.Sent, msg)
	sendFn := f.SendFn
	f.mu.Unlock()

	if sendFn != nil {
		return sendFn(ctx, msg)
	}
	return nil
}

// Messages returns a copy of what has been sent so far.
func (f *FakeSender) Messages() []email.Message {
	f.mu.Lock()
	defer f.mu.Unlock()
	return slices.Clone(f.Sent)
}
