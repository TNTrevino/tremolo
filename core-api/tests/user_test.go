package tests

import (
	"context"
	"strings"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
)

func validCreateUserRequest() dtos.CreateUserRequest {
	return dtos.CreateUserRequest{
		FirstName: "John",
		LastName:  "Doe",
		Role:      dtos.Student,
		Email:     "test@example.com",
		Password:  "ValidPass123!",
		SchoolID:  1,
	}
}

func TestCreateUserRequestValid_AcceptsAGoodRequest(t *testing.T) {
	t.Parallel()

	assert.Empty(t, validCreateUserRequest().Valid(context.Background()))
}

func TestCreateUserRequestValid_RejectsBadFields(t *testing.T) {
	t.Parallel()

	testCases := map[string]struct {
		mutate func(*dtos.CreateUserRequest)
		key    string
		want   string
	}{
		"missing first name": {func(r *dtos.CreateUserRequest) { r.FirstName = "" }, "first_name", "first name is required"},
		"numeric first name": {func(r *dtos.CreateUserRequest) { r.FirstName = "John3" }, "first_name", "alphabetical"},
		"long first name":    {func(r *dtos.CreateUserRequest) { r.FirstName = strings.Repeat("a", 256) }, "first_name", "shorter than 255"},
		"missing last name":  {func(r *dtos.CreateUserRequest) { r.LastName = "" }, "last_name", "last name is required"},
		"unknown role":       {func(r *dtos.CreateUserRequest) { r.Role = "INVALID_ROLE" }, "role", "must be one of"},
		"missing email":      {func(r *dtos.CreateUserRequest) { r.Email = "" }, "email", "email is required"},
		"malformed email":    {func(r *dtos.CreateUserRequest) { r.Email = "nope" }, "email", "correctly formatted"},
		"weak password":      {func(r *dtos.CreateUserRequest) { r.Password = "simplepassword" }, "password", "1 uppercase letter"},
		"missing school":     {func(r *dtos.CreateUserRequest) { r.SchoolID = 0 }, "school_id", "required when making a user"},
	}

	for name, tc := range testCases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			req := validCreateUserRequest()
			tc.mutate(&req)

			problems := req.Valid(context.Background())

			assert.Contains(t, problems[tc.key], tc.want)
		})
	}
}

// User doubles as a read shape and carries no Password, so its rules are
// the CreateUserRequest rules minus that one field.
func TestUserValid(t *testing.T) {
	t.Parallel()

	user := dtos.User{
		FirstName: "John",
		LastName:  "Doe",
		Role:      dtos.Student,
		Email:     "test@example.com",
		SchoolID:  1,
	}
	assert.Empty(t, user.Valid(context.Background()))

	user.FirstName = ""
	assert.NotEmpty(t, user.Valid(context.Background())["first_name"])
}
