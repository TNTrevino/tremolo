package tests

import (
	"context"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
)

func TestVerifyEmailRequestValid(t *testing.T) {
	t.Parallel()

	t.Run("empty token", func(t *testing.T) {
		t.Parallel()
		req := dtos.VerifyEmailRequest{Token: ""}
		problems := req.Valid(context.Background())
		assert.Equal(t, "Token is required", problems["token"])
	})

	t.Run("valid", func(t *testing.T) {
		t.Parallel()
		req := dtos.VerifyEmailRequest{Token: "sometoken"}
		assert.Empty(t, req.Valid(context.Background()))
	})
}
