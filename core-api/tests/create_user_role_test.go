package tests

import (
	"context"
	"errors"
	"testing"

	dtos "sight-reading/DTOs"
	"sight-reading/database/generated"
	"sight-reading/services"
	"sight-reading/tests/testutil"

	"github.com/stretchr/testify/assert"
)

// roleLookupFailsQuerier fails GetRoleIDByName and delegates everything
// else. Embedding the interface keeps the stub to the one method under
// test; any other call would panic on the nil embedded value, which is
// the point -- CreateUser must not reach one.
type roleLookupFailsQuerier struct {
	generated.Querier
}

func (roleLookupFailsQuerier) GetRoleIDByName(context.Context, string) (int32, error) {
	return 0, errors.New("roles table lookup failed")
}

// A failed role lookup must stay distinguishable from a generic failure:
// the controller renders it as 400 "Invalid role", and it reached the
// generic 500 branch before ErrInvalidRole wrapped it.
func TestCreateUser_RoleLookupFailure_IsInvalidRole(t *testing.T) {
	t.Parallel()
	// The stub needs no database, but CreateUser logs on this path and
	// the package logger is nil until the suite initialises it.
	testutil.SetupTestDB(t)

	req := &dtos.CreateUserRequest{
		FirstName: "Test",
		LastName:  "User",
		Role:      dtos.Teacher,
		Email:     "role.lookup.failure@test.com",
		Password:  "ValidPass123!",
		SchoolID:  1,
	}

	_, err := services.CreateUser(context.Background(), roleLookupFailsQuerier{}, req)

	assert.ErrorIs(t, err, services.ErrInvalidRole)
}
