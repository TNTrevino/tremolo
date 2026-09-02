package validations_test

import (
	"strings"
	"testing"

	"sight-reading/validations"

	"github.com/stretchr/testify/assert"
)

// The inputs here are the ones the go-playground tags accepted, so the
// replacements are pinned to the same answers before the library leaves.
func TestIsAlpha(t *testing.T) {
	t.Parallel()

	for input, want := range map[string]bool{
		"John":     true,
		"john":     true,
		"JOHN":     true,
		"":         false,
		"John3":    false,
		"John Doe": false,
		"John-Doe": false,
		"José":     false, // the library's alpha is ASCII only
	} {
		assert.Equal(t, want, validations.IsAlpha(input), "input %q", input)
	}
}

func TestIsAlphaNumUnicode(t *testing.T) {
	t.Parallel()

	for input, want := range map[string]bool{
		"Lincoln9":  true,
		"José":      true, // unicode letters are allowed here
		"":          false,
		"Lincoln 9": false,
		"Lincoln-9": false,
	} {
		assert.Equal(t, want, validations.IsAlphaNumUnicode(input), "input %q", input)
	}
}

func TestIsEmail(t *testing.T) {
	t.Parallel()

	for input, want := range map[string]bool{
		"test@example.com":      true,
		"a.b+c@sub.example.org": true,
		"":                      false,
		"invalidemail":          false,
		"no@domain":             false,
		"two@@at.com":           false,
		"has space@example.com": false,
	} {
		assert.Equal(t, want, validations.IsEmail(input), "input %q", input)
	}
}

func TestIsURL(t *testing.T) {
	t.Parallel()

	for input, want := range map[string]bool{
		"https://tremolonotes.com/auth/callback": true,
		"http://localhost:4200/callback":         true,
		"":                                       false,
		"/auth/callback":                         false,
		"tremolonotes.com":                       false,
	} {
		assert.Equal(t, want, validations.IsURL(input), "input %q", input)
	}
}

func TestVarChar255Length(t *testing.T) {
	t.Parallel()

	assert.True(t, validations.VarChar255Length(""))
	assert.True(t, validations.VarChar255Length(strings.Repeat("a", 255)))
	assert.False(t, validations.VarChar255Length(strings.Repeat("a", 256)))
}

func TestUserRole(t *testing.T) {
	t.Parallel()

	for input, want := range map[string]bool{
		"TEACHER": true,
		"STUDENT": true,
		"PARENT":  true,
		"ADMIN":   true,
		"teacher": false,
		"":        false,
		"OTHER":   false,
	} {
		assert.Equal(t, want, validations.UserRole(input), "input %q", input)
	}
}

func TestPasswordComplexity(t *testing.T) {
	t.Parallel()

	for input, want := range map[string]bool{
		"TestPass123!":   true,
		"simplepassword": false,
		"ALLUPPER123!":   false,
		"NoNumbers!!":    false,
		"NoSpecial123":   false,
		"":               false,
	} {
		assert.Equal(t, want, validations.PasswordComplexity(input), "input %q", input)
	}
}

// The inputs are the ones tests/note_game_service_test.go already uses,
// so the rewrite is pinned to the same answers.
func TestEntryTimeLength(t *testing.T) {
	t.Parallel()

	for input, want := range map[string]bool{
		"01:30:30": true,
		"00:05:30": true,
		"23:59:59": true,
		"25:30:30": false,
		"12:60:30": false,
		"12:30:60": false,
		"123030":   false,
		"12-30-30": false,
		"1:3:3":    false,
		"":         false,
		"12:30":    false,
	} {
		assert.Equal(t, want, validations.EntryTimeLength(input), "input %q", input)
	}
}
