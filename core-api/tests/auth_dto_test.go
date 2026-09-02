package tests

import (
	"context"
	"strings"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
)

func TestLoginRequestValid_AcceptsGoodCredentials(t *testing.T) {
	t.Parallel()

	req := dtos.LoginRequest{Email: "test@example.com", Password: "TestPass123!"}

	assert.Empty(t, req.Valid(context.Background()))
}

func TestLoginRequestValid_RejectsBadCredentials(t *testing.T) {
	t.Parallel()

	testCases := map[string]struct {
		req  dtos.LoginRequest
		key  string
		want string
	}{
		"empty email": {
			req:  dtos.LoginRequest{Email: "", Password: "TestPass123!"},
			key:  "email",
			want: "Email is required",
		},
		"malformed email": {
			req:  dtos.LoginRequest{Email: "invalidemail", Password: "TestPass123!"},
			key:  "email",
			want: "Email must be a valid email address",
		},
		"empty password": {
			req:  dtos.LoginRequest{Email: "test@example.com", Password: ""},
			key:  "password",
			want: "Password is required",
		},
		"short password": {
			req:  dtos.LoginRequest{Email: "test@example.com", Password: "short"},
			key:  "password",
			want: "Password must be at least 8 characters",
		},
		"simple password": {
			req:  dtos.LoginRequest{Email: "test@example.com", Password: "simplepassword"},
			key:  "password",
			want: "Password must contain at least 1 uppercase letter",
		},
		// addPasswordProblem is shared with RegisterRequest.Valid, so
		// bcrypt's 72-byte cap (#269 review) lands on Login too. That is
		// deliberate, not a side effect: it is the same harmless,
		// consistent rule applied everywhere a password is compared or
		// hashed.
		"long password": {
			req:  dtos.LoginRequest{Email: "test@example.com", Password: strings.Repeat("a", 73)},
			key:  "password",
			want: "Password must be at most 72 characters",
		},
	}

	for name, tc := range testCases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			problems := tc.req.Valid(context.Background())
			assert.Contains(t, problems[tc.key], tc.want)
		})
	}
}

func validRegisterRequest() dtos.RegisterRequest {
	return dtos.RegisterRequest{
		Email:     "test@example.com",
		Password:  "TestPass123!",
		FirstName: "John",
		LastName:  "Doe",
		Role:      "STUDENT",
	}
}

func TestRegisterRequestValid_AcceptsAGoodRequest(t *testing.T) {
	t.Parallel()

	assert.Empty(t, validRegisterRequest().Valid(context.Background()))
}

func TestRegisterRequestValid_RejectsBadFields(t *testing.T) {
	t.Parallel()

	testCases := map[string]struct {
		mutate func(*dtos.RegisterRequest)
		key    string
		want   string
	}{
		"empty email":    {func(r *dtos.RegisterRequest) { r.Email = "" }, "email", "Email is required"},
		"short first":    {func(r *dtos.RegisterRequest) { r.FirstName = "J" }, "first_name", "First name must be at least 2 characters"},
		"empty first":    {func(r *dtos.RegisterRequest) { r.FirstName = "" }, "first_name", "First name is required"},
		"short last":     {func(r *dtos.RegisterRequest) { r.LastName = "D" }, "last_name", "Last name must be at least 2 characters"},
		"empty role":     {func(r *dtos.RegisterRequest) { r.Role = "" }, "role", "Role is required"},
		"unknown role":   {func(r *dtos.RegisterRequest) { r.Role = "ADMIN" }, "role", "Role must be one of: STUDENT, TEACHER"},
		"parent role":    {func(r *dtos.RegisterRequest) { r.Role = "PARENT" }, "role", "Role must be one of: STUDENT, TEACHER"},
		"short password": {func(r *dtos.RegisterRequest) { r.Password = "Aa1!" }, "password", "Password must be at least 8 characters"},
	}

	for name, tc := range testCases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			req := validRegisterRequest()
			tc.mutate(&req)

			problems := req.Valid(context.Background())

			assert.Contains(t, problems[tc.key], tc.want)
		})
	}
}

// TestRegisterRequestValid_PasswordLengthCap pins bcrypt's 72-byte limit
// as a DTO rule (#269 review). Password length was previously bounded only
// below (>= 8): a password over 72 bytes reached bcrypt.GenerateFromPassword
// in services.Register and errored with ErrPasswordTooLong, permanently
// burning a single-use teacher invite code with no account created. Go's
// len() on a string counts bytes, which is exactly bcrypt's unit, so this
// check needs no separate byte-counting helper.
func TestRegisterRequestValid_PasswordLengthCap(t *testing.T) {
	t.Parallel()

	tooLong := validRegisterRequest()
	tooLong.Password = strings.Repeat("a", 73)
	assert.Equal(t, "Password must be at most 72 characters",
		tooLong.Valid(context.Background())["password"])

	atLimit := validRegisterRequest()
	atLimit.Password = "Aa1!" + strings.Repeat("a", 68) // exactly 72 bytes
	assert.Empty(t, atLimit.Valid(context.Background()), "a 72-byte password is still at the limit, not over it")
}

// TestRegisterRequestValid_TeacherRequiresInviteCode pins the shape rule
// behind the TEACHER gate (#250). The DTO only checks that a code was
// typed; whether it is a real one is a database question the service
// answers.
func TestRegisterRequestValid_TeacherRequiresInviteCode(t *testing.T) {
	t.Parallel()

	testCases := map[string]struct {
		inviteCode string
		want       string
	}{
		"missing":         {inviteCode: "", want: "Invite code is required for teacher accounts"},
		"only whitespace": {inviteCode: "   ", want: "Invite code is required for teacher accounts"},
		"present":         {inviteCode: "ABCD2345", want: ""},
	}

	for name, tc := range testCases {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			req := validRegisterRequest()
			req.Role = "TEACHER"
			req.InviteCode = tc.inviteCode

			problems := req.Valid(context.Background())

			if tc.want == "" {
				assert.Empty(t, problems)
				return
			}
			assert.Equal(t, tc.want, problems["invite_code"])
		})
	}
}

// TestRegisterRequestValid_StudentIgnoresInviteCode keeps the gate off
// the student path: a student never sees the field, so an absent code
// must not become a problem for them.
func TestRegisterRequestValid_StudentIgnoresInviteCode(t *testing.T) {
	t.Parallel()

	req := validRegisterRequest()
	req.InviteCode = ""

	problems := req.Valid(context.Background())

	assert.NotContains(t, problems, "invite_code")
	assert.Empty(t, problems)
}

// TestRegisterRequestValid_AcceptsGoodGradeLevels pins the full allowed
// set (#244): "6".."12" are the grades this app targets, and "other"
// covers an adult or anyone the band does not describe -- an answer, not
// a refusal.
func TestRegisterRequestValid_AcceptsGoodGradeLevels(t *testing.T) {
	t.Parallel()

	for _, grade := range []string{"6", "7", "8", "9", "10", "11", "12", "other"} {
		t.Run(grade, func(t *testing.T) {
			t.Parallel()
			req := validRegisterRequest()
			req.GradeLevel = grade

			problems := req.Valid(context.Background())

			assert.NotContains(t, problems, "grade_level")
			assert.Empty(t, problems)
		})
	}
}

// TestRegisterRequestValid_GradeLevelOptional keeps the field optional:
// it gates nothing, every pre-#244 account has none, and a request body
// that never sends the key -- which decodes to the same "" zero value as
// one that sends it empty -- must stay valid either way.
func TestRegisterRequestValid_GradeLevelOptional(t *testing.T) {
	t.Parallel()

	req := validRegisterRequest()
	req.GradeLevel = ""

	problems := req.Valid(context.Background())

	assert.NotContains(t, problems, "grade_level")
	assert.Empty(t, problems)
}

// TestRegisterRequestValid_RejectsBadGradeLevels pins the exact message
// and the shape of the allowed set: one grade past the top of the band,
// a value that is not a grade at all, and the right word in the wrong
// case (the map is an exact match, not case-insensitive).
func TestRegisterRequestValid_RejectsBadGradeLevels(t *testing.T) {
	t.Parallel()

	const want = "Grade level must be one of: 6, 7, 8, 9, 10, 11, 12, other"

	for _, grade := range []string{"13", "kindergarten", "OTHER"} {
		t.Run(grade, func(t *testing.T) {
			t.Parallel()
			req := validRegisterRequest()
			req.GradeLevel = grade

			problems := req.Valid(context.Background())

			assert.Equal(t, want, problems["grade_level"])
		})
	}
}

// TestRegisterRequestValid_GradeLevelTrimsWhitespace pins TrimSpace: a
// value padded by, say, a form field's autofill must not be rejected for
// whitespace that was never part of the answer.
func TestRegisterRequestValid_GradeLevelTrimsWhitespace(t *testing.T) {
	t.Parallel()

	req := validRegisterRequest()
	req.GradeLevel = " 7 "

	problems := req.Valid(context.Background())

	assert.NotContains(t, problems, "grade_level")
	assert.Empty(t, problems)
}

// TestRegisterRequestValid_TeacherGradeLevelNotRejected keeps the rule
// presence-based, not role-based: the signup page never shows a teacher
// this field, but Valid() does not check role either, so a client that
// sends one anyway is validated exactly like a student's would be.
func TestRegisterRequestValid_TeacherGradeLevelNotRejected(t *testing.T) {
	t.Parallel()

	req := validRegisterRequest()
	req.Role = "TEACHER"
	req.InviteCode = "ABCD2345"
	req.GradeLevel = "8"

	problems := req.Valid(context.Background())

	assert.NotContains(t, problems, "grade_level")
	assert.Empty(t, problems)
}

func TestGoogleCallbackRequestValid(t *testing.T) {
	t.Parallel()

	good := dtos.GoogleCallbackRequest{
		Code:        "auth-code",
		RedirectURI: "https://tremolonotes.com/auth/callback",
	}
	assert.Empty(t, good.Valid(context.Background()))

	noCode := good
	noCode.Code = ""
	assert.Equal(t, "Authorization code is required", noCode.Valid(context.Background())["code"])

	noURI := good
	noURI.RedirectURI = ""
	assert.Equal(t, "Redirect URI is required", noURI.Valid(context.Background())["redirect_uri"])

	badURI := good
	badURI.RedirectURI = "not-a-url"
	assert.Equal(t, "Redirect URI must be a valid URL", badURI.Valid(context.Background())["redirect_uri"])
}
