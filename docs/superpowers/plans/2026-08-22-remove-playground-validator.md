# Remove go-playground/validator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `github.com/go-playground/validator/v10` from `core-api` and replace it with a `Valid(ctx) map[string]string` method on each request DTO, run by a generic `httpx.DecodeValid` helper.

**Architecture:** Follows Mat Ryer's "How I write HTTP services in Go after 13 years". A one-method `Validator` interface lives in `httpx`. `DecodeValid[T Validator]` decodes the JSON body and calls `Valid` in one step, so the type constraint makes a missing `Valid` method a build error. Validation moves out of the service layer and into the controller's decode step. The wire format does not change: the problems map is joined back into the `{"error": "..."}` string the API returns today.

**Tech Stack:** Go 1.x, `net/http`, `encoding/json`, `testify` (`assert` / `require`), sqlc-generated `database/generated` queries.

**Spec:** `docs/superpowers/specs/2026-08-22-remove-playground-validator-design.md`

## Global Constraints

- Work only inside `core-api/`. No frontend or `music-api` change.
- Every user-visible message string is copied **verbatim** from the code being replaced, including the misspellings `SchooolID`, `charaters`, `militaty` and `sucessfully`.
- `Valid` always uses a **value receiver**: `func (r LoginRequest) Valid(ctx context.Context) map[string]string`.
- `Valid` always returns a non-nil map. An empty map means valid.
- Map keys are the field's **JSON name** (`first_name`, not `FirstName`). Message values keep their existing `FieldName:` prefix where one exists today.
- One problem per field. Rules for a field are checked in order presence → format → length, and the first failure wins.
- Known bugs are reproduced, not fixed. Where a rule has no effect today, the replacement has no rule and carries a `FIXME`.
- Run `make check-go` from the repo root before every commit. It runs `gofmt -s`, `go vet`, golangci-lint and `go test`.
- Never run `git stash`. This is a worktree and the stash stack is shared.
- Commit at the end of every task. Do not batch commits.

---

### Task 1: The `httpx` decode-and-validate helper

**Files:**
- Modify: `core-api/httpx/httpx.go`
- Test: `core-api/httpx/httpx_test.go`

**Interfaces:**
- Consumes: nothing. This is the base task.
- Produces:
  - `httpx.Validator` — `interface{ Valid(ctx context.Context) (problems map[string]string) }`
  - `httpx.DecodeValid[T Validator](r *http.Request) (T, map[string]string, error)`
  - `httpx.ProblemsError(problems map[string]string) string`
  - `httpx.DecodeError(w http.ResponseWriter, problems map[string]string)`

- [ ] **Step 1: Write the failing tests**

Append to `core-api/httpx/httpx_test.go`:

```go
// validBody is a request shape whose Valid method fails on an empty Name.
// It exists only to exercise DecodeValid.
type validBody struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}

func (b validBody) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}
	if b.Name == "" {
		problems["name"] = "Name: is required"
	}
	if b.Age < 0 {
		problems["age"] = "Age: must not be negative"
	}
	return problems
}

func TestDecodeValid_PassesAValidBody(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"tremolo","age":3}`))
	got, problems, err := httpx.DecodeValid[validBody](r)

	require.NoError(t, err)
	assert.Empty(t, problems)
	assert.Equal(t, "tremolo", got.Name)
}

// A body that parses but breaks a rule must come back with the problems
// map, because the caller renders it into the response.
func TestDecodeValid_ReturnsProblems(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":"","age":-1}`))
	_, problems, err := httpx.DecodeValid[validBody](r)

	require.Error(t, err)
	assert.Equal(t, map[string]string{
		"name": "Name: is required",
		"age":  "Age: must not be negative",
	}, problems)
}

// A body that does not parse must produce a nil problems map, because
// DecodeError uses an empty map to mean "the body did not parse".
func TestDecodeValid_MalformedBodyHasNoProblems(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`{"name":`))
	_, problems, err := httpx.DecodeValid[validBody](r)

	require.Error(t, err)
	assert.Nil(t, problems)
}

// A JSON body of `null` decodes into the zero value rather than failing,
// so Valid still runs and reports the missing field. This is why Valid
// uses a value receiver: a pointer receiver would panic here.
func TestDecodeValid_NullBodyIsValidated(t *testing.T) {
	t.Parallel()

	r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(`null`))
	_, problems, err := httpx.DecodeValid[validBody](r)

	require.Error(t, err)
	assert.Equal(t, "Name: is required", problems["name"])
}

// Go map order is random. Two identical requests must not produce two
// different response bodies, so the keys are sorted.
func TestProblemsError_SortsByKey(t *testing.T) {
	t.Parallel()

	got := httpx.ProblemsError(map[string]string{
		"zebra": "Zebra: bad",
		"apple": "Apple: bad",
		"mango": "Mango: bad",
	})

	assert.Equal(t, "Apple: bad, Mango: bad, Zebra: bad", got)
}

func TestProblemsError_EmptyMapIsEmptyString(t *testing.T) {
	t.Parallel()

	assert.Equal(t, "", httpx.ProblemsError(map[string]string{}))
}

func TestDecodeError_RendersProblems(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	httpx.DecodeError(w, map[string]string{"name": "Name: is required"})

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.JSONEq(t, `{"error":"Name: is required"}`, w.Body.String())
}

func TestDecodeError_EmptyProblemsMeansBadBody(t *testing.T) {
	t.Parallel()

	w := httptest.NewRecorder()
	httpx.DecodeError(w, nil)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.JSONEq(t, `{"error":"Invalid request body"}`, w.Body.String())
}
```

Add `"context"` to that file's import block.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd core-api && go test ./httpx/ -run 'DecodeValid|ProblemsError|DecodeError' -v`
Expected: FAIL to build, with `undefined: httpx.DecodeValid`.

- [ ] **Step 3: Write the implementation**

Add to `core-api/httpx/httpx.go`, below the existing `Decode`:

```go
// Validator is a request body that can check itself.
//
// The method is named Valid rather than Validate because it does not
// return an error: it returns the problems it found, keyed by the JSON
// field name, so a caller can render them per field. An empty map means
// the body is valid.
//
// The ctx argument is unused by every rule today. It is here so a rule
// that needs the database -- a uniqueness check, a role lookup -- can be
// added without changing the interface and every implementation of it.
type Validator interface {
	Valid(ctx context.Context) (problems map[string]string)
}

// DecodeValid reads a JSON request body into a fresh T and runs its Valid
// method.
//
// The [T Validator] constraint is the point of this function existing
// separately from Decode: a request shape that forgets Valid fails the
// build here rather than skipping validation at runtime.
//
// The three return values separate the two failure modes a caller has to
// tell apart. A nil problems map with a non-nil error means the body did
// not parse. A non-empty problems map means it parsed and broke a rule.
func DecodeValid[T Validator](r *http.Request) (T, map[string]string, error) {
	var v T
	if err := json.NewDecoder(r.Body).Decode(&v); err != nil {
		return v, nil, fmt.Errorf("decode json body: %w", err)
	}
	if problems := v.Valid(r.Context()); len(problems) > 0 {
		return v, problems, fmt.Errorf("invalid %T: %d problems", v, len(problems))
	}
	return v, nil, nil
}

// ProblemsError renders a problems map as the single error string this
// API has always returned.
//
// The keys are sorted before joining. Go map iteration order is random,
// and a response body that reorders itself between two identical requests
// is not acceptable.
func ProblemsError(problems map[string]string) string {
	keys := slices.Sorted(maps.Keys(problems))
	out := make([]string, 0, len(keys))
	for _, k := range keys {
		out = append(out, problems[k])
	}
	return strings.Join(out, ", ")
}

// DecodeError writes the 400 for a failed DecodeValid.
//
// An empty problems map means the body did not parse, which gets the
// generic message: there are no fields to name.
func DecodeError(w http.ResponseWriter, problems map[string]string) {
	if len(problems) == 0 {
		JSON(w, http.StatusBadRequest, M{"error": "Invalid request body"})
		return
	}
	JSON(w, http.StatusBadRequest, M{"error": ProblemsError(problems)})
}
```

Add `"context"`, `"maps"`, `"slices"` and `"strings"` to the file's import block.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd core-api && go test ./httpx/ -v`
Expected: PASS, including the pre-existing `Decode` tests.

- [ ] **Step 5: Commit**

```bash
cd /home/noetrevino/projects/tremolo2
make check-go
git add core-api/httpx/httpx.go core-api/httpx/httpx_test.go
git commit -m "feat(core-api): add a Validator interface and DecodeValid to httpx

Follows Mat Ryer's decodeValid: a [T Validator] type parameter makes a
request shape that forgets Valid a build error rather than a body that
silently skips validation.

ProblemsError sorts its keys before joining. Go map order is random, and
two identical requests must not produce two different response bodies.

Nothing calls these yet."
```

---

### Task 2: Rewrite the `validations` rules as plain predicates

**Files:**
- Modify: `core-api/validations/validations.go`
- Modify: `core-api/DTOs/user_dto.go:82-84` (the `RegisterValidation` map only)
- Modify: `core-api/DTOs/auth_dtos.go:23,88` (the `RegisterValidation` calls only)
- Modify: `core-api/DTOs/entry_dto.go:58` (the `RegisterValidation` call only)
- Modify: `core-api/DTOs/district_dto.go:27` (the `RegisterValidation` call only)
- Test: `core-api/validations/validations_test.go` (create)

**Interfaces:**
- Consumes: nothing.
- Produces, all in package `validations`:
  - `IsAlpha(s string) bool`
  - `IsAlphaNumUnicode(s string) bool`
  - `IsEmail(s string) bool`
  - `IsURL(s string) bool`
  - `VarChar255Length(s string) bool` — signature change
  - `UserRole(s string) bool` — signature change
  - `PasswordComplexity(s string) bool` — signature change
  - `EntryTimeLength(s string) bool` — signature change

The four private `validator.FieldLevel` adapters `varChar255LengthTag`, `userRoleTag`, `passwordComplexityTag` and `entryTimeLengthTag` exist only so the six DTOs still on struct tags keep building. Task 8 deletes them.

- [ ] **Step 1: Write the failing tests**

Create `core-api/validations/validations_test.go`:

```go
package validations_test

import (
	"testing"

	"sight-reading/validations"

	"github.com/stretchr/testify/assert"
)

// The inputs here are the ones the go-playground tags accepted, so the
// replacements are pinned to the same answers before the library leaves.
func TestIsAlpha(t *testing.T) {
	t.Parallel()

	for input, want := range map[string]bool{
		"John":    true,
		"john":    true,
		"JOHN":    true,
		"":        false,
		"John3":   false,
		"John Doe": false,
		"John-Doe": false,
		"José":    false, // the library's alpha is ASCII only
	} {
		assert.Equal(t, want, validations.IsAlpha(input), "input %q", input)
	}
}

func TestIsAlphaNumUnicode(t *testing.T) {
	t.Parallel()

	for input, want := range map[string]bool{
		"Lincoln9":   true,
		"José":       true, // unicode letters are allowed here
		"":           false,
		"Lincoln 9":  false,
		"Lincoln-9":  false,
	} {
		assert.Equal(t, want, validations.IsAlphaNumUnicode(input), "input %q", input)
	}
}

func TestIsEmail(t *testing.T) {
	t.Parallel()

	for input, want := range map[string]bool{
		"test@example.com":       true,
		"a.b+c@sub.example.org":  true,
		"":                       false,
		"invalidemail":           false,
		"no@domain":              false,
		"two@@at.com":            false,
		"has space@example.com":  false,
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
		"NoNumbers!!":     false,
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
```

Add `"strings"` to that file's import block.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd core-api && go test ./validations/ -v`
Expected: FAIL to build, with `undefined: validations.IsAlpha` and `too many arguments` on the four renamed rules.

- [ ] **Step 3: Write the implementation**

Replace the whole body of `core-api/validations/validations.go` below the package clause with:

```go
import (
	"fmt"
	"net/url"
	"regexp"
	"unicode"

	"github.com/go-playground/validator/v10"
)

// The rules below are plain predicates over a string. They took a
// validator.FieldLevel until the go-playground dependency came out; the
// *Tag adapters at the bottom of this file are the last users of that
// signature and go away with the dependency.

// entryTimePattern is deliberately unanchored, and EntryTimeLength
// requires exactly one match. That is the rule this service has always
// applied, so it is kept as-is: anchoring it would newly reject strings
// with a valid time embedded in them.
var entryTimePattern = regexp.MustCompile("([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]")

// EntryTimeLength reports whether s holds exactly one military-format
// time.
func EntryTimeLength(s string) bool {
	return len(entryTimePattern.FindAllString(s, -1)) == 1
}

// VarChar255Length reports whether s fits the varchar(255) columns the
// user and school tables use. An empty string fits; presence is a
// separate rule.
func VarChar255Length(s string) bool {
	return len(s) <= 255
}

// UserRole reports whether s is one of the four roles the users table
// accepts.
func UserRole(s string) bool {
	switch s {
	case "TEACHER", "STUDENT", "PARENT", "ADMIN":
		return true
	}
	return false
}

var (
	hasUpper   = regexp.MustCompile(`[A-Z]`)
	hasLower   = regexp.MustCompile(`[a-z]`)
	hasNumber  = regexp.MustCompile(`[0-9]`)
	hasSpecial = regexp.MustCompile(`[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]`)
)

// PasswordComplexity reports whether s holds at least one uppercase
// letter, one lowercase letter, one digit and one special character.
func PasswordComplexity(s string) bool {
	return hasUpper.MatchString(s) &&
		hasLower.MatchString(s) &&
		hasNumber.MatchString(s) &&
		hasSpecial.MatchString(s)
}

// IsAlpha reports whether s is a non-empty run of ASCII letters. This is
// what the "alpha" struct tag meant: it is ASCII-only, so an accented
// name fails it. That is existing behavior, not a new restriction.
func IsAlpha(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if (r < 'a' || r > 'z') && (r < 'A' || r > 'Z') {
			return false
		}
	}
	return true
}

// IsAlphaNumUnicode reports whether s is a non-empty run of Unicode
// letters and numbers, matching the \p{L}\p{N} class the
// "alphanumunicode" tag used.
func IsAlphaNumUnicode(s string) bool {
	if s == "" {
		return false
	}
	for _, r := range s {
		if !unicode.IsLetter(r) && !unicode.IsNumber(r) {
			return false
		}
	}
	return true
}

// emailPattern is loose on purpose: one @, no whitespace, and a dot in
// the domain. The library's regexp was stricter about the local part and
// looser about the domain -- it accepted "user@localhost". Requiring the
// dot is the one deliberate tightening here, because this service only
// ever mails real addresses.
var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

// IsEmail reports whether s looks like an email address.
func IsEmail(s string) bool {
	return emailPattern.MatchString(s)
}

// IsURL reports whether s is an absolute URL with a scheme and a host.
// The one caller is the Google OAuth redirect_uri.
func IsURL(s string) bool {
	u, err := url.ParseRequestURI(s)
	if err != nil {
		return false
	}
	return u.Scheme != "" && u.Host != ""
}

// The adapters below let the DTOs that still carry `validate:` struct
// tags keep building while they are migrated one file at a time. They
// are deleted together with the go-playground dependency.

func entryTimeLengthTag(fl validator.FieldLevel) bool {
	return EntryTimeLength(fl.Field().String())
}

func varChar255LengthTag(fl validator.FieldLevel) bool {
	return VarChar255Length(fl.Field().String())
}

func userRoleTag(fl validator.FieldLevel) bool {
	return UserRole(fl.Field().String())
}

func passwordComplexityTag(fl validator.FieldLevel) bool {
	return PasswordComplexity(fl.Field().String())
}

// TagRules is the tag-name to adapter map the remaining tag-based DTOs
// register. It is a temporary bridge; see the adapters above.
var TagRules = map[string]validator.Func{
	"time":                entryTimeLengthTag,
	"len255":              varChar255LengthTag,
	"role":                userRoleTag,
	"password_complexity": passwordComplexityTag,
}

// ValidateChartInterval validates chart interval parameter
// Valid values: day, week, month, year (for date_trunc), all (no time constraint)
// This prevents invalid data from reaching the database layer
// Returns error if interval is invalid, nil otherwise
func ValidateChartInterval(interval string) error {
	validIntervals := map[string]bool{
		"day":   true,
		"week":  true,
		"month": true,
		"year":  true,
		"all":   true,
	}
	if !validIntervals[interval] {
		return fmt.Errorf("invalid interval '%s': must be one of: day, week, month, year, all", interval)
	}
	return nil
}
```

- [ ] **Step 4: Point the five remaining tag registrations at `TagRules`**

In `core-api/DTOs/user_dto.go`, replace the map literal inside `newUserValidator` with `validations.TagRules`:

```go
func newUserValidator() (*validator.Validate, error) {
	validate := validator.New()
	for tag, fn := range validations.TagRules {
		if err := validate.RegisterValidation(tag, fn); err != nil {
			return nil, err
		}
	}
	return validate, nil
}
```

In `core-api/DTOs/auth_dtos.go` at lines 23 and 88, replace
`validations.PasswordComplexity` with `validations.TagRules["password_complexity"]`.

In `core-api/DTOs/entry_dto.go` at line 58, replace
`validations.EntryTimeLength` with `validations.TagRules["time"]`.

In `core-api/DTOs/district_dto.go` at line 27, replace
`validations.VarChar255Length` with `validations.TagRules["len255"]`.

- [ ] **Step 5: Run the full suite to verify nothing regressed**

Run: `cd core-api && go test ./... -count=1`
Expected: PASS. The tag-based DTOs behave identically; only the function reaching each tag changed.

- [ ] **Step 6: Commit**

```bash
cd /home/noetrevino/projects/tremolo2
make check-go
git add core-api/validations core-api/DTOs
git commit -m "refactor(core-api): make the validation rules plain string predicates

Each rule took a validator.FieldLevel, which tied it to the library and
made it untestable without building a validator. Each is now a
func(string) bool with a table test.

The four *Tag adapters and the TagRules map bridge the DTOs that still
carry struct tags. Both go away with the dependency."
```

---

### Task 3: Move the already-hand-written DTOs onto `Valid`

These four shapes never used the library, so this task proves the whole `DecodeValid` path end to end without touching a single struct tag.

**Files:**
- Modify: `core-api/DTOs/class_dto.go`
- Modify: `core-api/DTOs/game_settings_dto.go`
- Modify: `core-api/DTOs/assignment_dto.go`
- Modify: `core-api/controllers/class_controller.go:43,103,204`
- Modify: `core-api/controllers/game_settings_controller.go:64`
- Modify: `core-api/controllers/friends_controller.go:79`
- Modify: `core-api/services/class_service.go:73,164`
- Modify: `core-api/services/assignment_service.go:65`
- Modify: `core-api/services/game_settings_service.go:40`
- Test: `core-api/tests/config_validation_dto_test.go`, `core-api/tests/game_settings_service_test.go:149`

**Interfaces:**
- Consumes: `httpx.DecodeValid`, `httpx.DecodeError` from Task 1.
- Produces:
  - `dtos.CreateClassRequest.Valid`, `dtos.JoinClassRequest.Valid`
  - `dtos.CreateAssignmentRequest.Valid`, `dtos.GameSettingsRequest.Valid`
  - `dtos.ConfigBlobProblem(config json.RawMessage) string` — replaces `ConfigBlobErrors`, returns `""` when the blob is fine
  - `controllers.addFriendRequest.Valid`

- [ ] **Step 1: Write the failing test**

Replace the two `req.Validate()` calls in `core-api/tests/config_validation_dto_test.go` (lines 46 and 58) with `req.Valid(context.Background())` and assert on the map. Add `"context"` to the imports. For example, the assertion at line 48 becomes:

```go
problems := req.Valid(context.Background())
assert.Contains(t, problems["config"], "Config")
```

At `core-api/tests/game_settings_service_test.go:149`, replace the three
lines inside the subtest. The table's cases already carry a `wantErr`
field; keep that name so the case list does not change:

```go
problems := tc.req.Valid(context.Background())
if tc.wantErr {
	assert.NotEmpty(t, problems)
} else {
	assert.Empty(t, problems)
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd core-api && go test ./tests/ -run 'ConfigValidation|GameSettings' -count=1`
Expected: FAIL to build, with `req.Valid undefined`.

- [ ] **Step 3: Convert the four DTOs**

In `core-api/DTOs/game_settings_dto.go`, replace `ConfigBlobErrors` and `GameSettingsRequest.Validate`:

```go
// ConfigBlobProblem checks a JSONB game-config blob: present, within the
// size cap, valid JSON, and a JSON object (not a bare array or scalar).
// It returns "" when the blob is fine.
//
// Shared by the per-user game settings and the frozen assignment snapshot
// so the two cannot drift.
func ConfigBlobProblem(config json.RawMessage) string {
	switch {
	case len(config) == 0:
		return "Config: is required"
	case len(config) > MaxGameSettingsConfigBytes:
		return "Config: too large"
	case !json.Valid(config):
		return "Config: must be valid JSON"
	}
	// json.Unmarshal accepts the literal `null` into a map (leaving probe
	// nil) without error, so guard it explicitly: a JSON object unmarshals
	// to a non-nil map, `null`/arrays/scalars do not.
	var probe map[string]json.RawMessage
	if err := json.Unmarshal(config, &probe); err != nil || probe == nil {
		return "Config: must be a JSON object"
	}
	return ""
}

func (r GameSettingsRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if !ValidSettingsGameTypes[r.GameType] {
		problems["game_type"] = "GameType: must be a non-note game type"
	}
	if msg := ConfigBlobProblem(r.Config); msg != "" {
		problems["config"] = msg
	}

	return problems
}
```

Drop the now-unused `"errors"` and `"strings"` imports from that file and add `"context"`.

In `core-api/DTOs/class_dto.go`:

```go
func (r CreateClassRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	name := strings.TrimSpace(r.Name)
	switch {
	case name == "":
		problems["name"] = "Name: is required"
	case len(name) > 255:
		problems["name"] = "Name: too long"
	}

	return problems
}

func (r JoinClassRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if strings.TrimSpace(r.JoinCode) == "" {
		problems["join_code"] = "JoinCode: is required"
	}

	return problems
}
```

Drop `"errors"` from that file's imports and add `"context"`.

In `core-api/DTOs/assignment_dto.go`:

```go
func (r CreateAssignmentRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	title := strings.TrimSpace(r.Title)
	switch {
	case title == "":
		problems["title"] = "Title: is required"
	case len(r.Title) > 255:
		problems["title"] = "Title: too long"
	}

	if !ValidGameTypes[r.GameType] {
		problems["game_type"] = "GameType: must be a valid game type"
	}

	// Same shape rules as game_settings: the config is a snapshot of one.
	if msg := ConfigBlobProblem(r.Config); msg != "" {
		problems["config"] = msg
	}

	if r.TargetQuestions != nil && *r.TargetQuestions <= 0 {
		problems["target_questions"] = "TargetQuestions: must be positive"
	}
	if r.TargetAccuracy != nil && (*r.TargetAccuracy < 1 || *r.TargetAccuracy > 100) {
		problems["target_accuracy"] = "TargetAccuracy: must be between 1 and 100"
	}

	return problems
}
```

Drop `"errors"` from that file's imports and add `"context"`.

- [ ] **Step 4: Give `addFriendRequest` a `Valid` method**

In `core-api/controllers/friends_controller.go`, add below the type declaration:

```go
// Valid rejects a friend_id of 0 as missing rather than as a friend whose
// id is 0. A malformed body and an absent, null or zero friend_id all
// have to produce the same 400.
func (r addFriendRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if r.FriendID == 0 {
		problems["friend_id"] = "Invalid request body"
	}

	return problems
}
```

Add `"context"` to that file's imports.

- [ ] **Step 5: Switch the controllers to `DecodeValid`**

In `core-api/controllers/class_controller.go`, each of the three decode blocks becomes:

```go
req, problems, err := httpx.DecodeValid[dtos.CreateClassRequest](r)
if err != nil {
	httpx.DecodeError(w, problems)
	return
}
```

Use the matching type at lines 103 (`dtos.JoinClassRequest`) and 204 (`dtos.CreateAssignmentRequest`).

Apply the same shape in `core-api/controllers/game_settings_controller.go:64` with `dtos.GameSettingsRequest`.

In `core-api/controllers/friends_controller.go`, replace the decode block and delete the comment above it that describes the removed inline check:

```go
req, problems, err := httpx.DecodeValid[addFriendRequest](r)
if err != nil {
	httpx.DecodeError(w, problems)
	return
}
```

- [ ] **Step 6: Delete the four service-layer guards**

Remove the whole `if err := req.Validate(); err != nil { ... }` block from:

- `core-api/services/class_service.go:73` (`CreateClass`)
- `core-api/services/class_service.go:164` (`JoinClass`)
- `core-api/services/assignment_service.go:65` (`CreateAssignment`)
- `core-api/services/game_settings_service.go:40` (`UpsertGameSettings`)

In `UpsertGameSettings` the removed block was the only user of `logger` in that function; leave the import if other functions in the file still use it, and remove it if they do not. `go vet` will say.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd core-api && go test ./... -count=1`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
cd /home/noetrevino/projects/tremolo2
make check-go
git add core-api
git commit -m "refactor(core-api): validate the class and settings bodies at decode

These four shapes never used go-playground, so they move first and prove
the DecodeValid path end to end with no struct tags in the way.

Validation leaves the service layer: the controller now rejects a bad
body before the service is called, so a class or settings 400 carries the
field detail instead of the generic \"Invalid request\".

ConfigBlobErrors returned a slice that never held more than one element.
It is now ConfigBlobProblem, returning that one string."
```

---

### Task 4: `Entry`

**Files:**
- Modify: `core-api/DTOs/entry_dto.go`
- Modify: `core-api/controllers/note_game_controller.go:36`
- Modify: `core-api/services/note_game_service.go:34`
- Modify: `core-api/generation/insert_data.go:30`
- Test: `core-api/tests/entry_test.go`, `core-api/tests/note_game_service_test.go`

**Interfaces:**
- Consumes: `httpx.DecodeValid`, `httpx.DecodeError`, `validations.EntryTimeLength(string)`.
- Produces: `dtos.Entry.Valid(ctx) map[string]string`. `ValidateEntry` is gone.

- [ ] **Step 1: Move the three service-level tests down to the DTO**

Delete `TestCreateNoteGameEntry_ValidationError_TimeFormat`,
`TestCreateNoteGameEntry_ValidationError_CorrectMoreThanTotal` and
`TestCreateNoteGameEntry_ValidationError_MissingFields` from
`core-api/tests/note_game_service_test.go`. They call the service, and the
service stops validating in this task.

Replace `core-api/tests/entry_test.go` with the table test that covers the
same ground and needs no database:

```go
package tests

import (
	"context"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
)

func validEntry() dtos.Entry {
	return dtos.Entry{
		TimeLength:       "01:30:30",
		TotalQuestions:   12,
		CorrectQuestions: 11,
		UserID:           4,
		NPM:              5,
	}
}

func TestEntryValid_AcceptsAGoodEntry(t *testing.T) {
	t.Parallel()

	assert.Empty(t, validEntry().Valid(context.Background()))
}

// The time format is the rule most likely to change by accident, so every
// shape the service used to reject is pinned here.
func TestEntryValid_RejectsABadTimeLength(t *testing.T) {
	t.Parallel()

	for name, timeLength := range map[string]string{
		"invalid hours":   "25:30:30",
		"invalid minutes": "12:60:30",
		"invalid seconds": "12:30:60",
		"no colons":       "123030",
		"dashes":          "12-30-30",
		"single digits":   "1:3:3",
		"empty":           "",
		"partial":         "12:30",
	} {
		t.Run(name, func(t *testing.T) {
			t.Parallel()
			entry := validEntry()
			entry.TimeLength = timeLength

			problems := entry.Valid(context.Background())

			assert.Contains(t, problems["time_length"], "TimeLength")
		})
	}
}

func TestEntryValid_RejectsMoreCorrectThanTotal(t *testing.T) {
	t.Parallel()

	entry := validEntry()
	entry.TotalQuestions = 10
	entry.CorrectQuestions = 15

	problems := entry.Valid(context.Background())

	assert.Contains(t, problems["correct_questions"], "CorrectQuestions")
}

func TestEntryValid_RejectsMissingFields(t *testing.T) {
	t.Parallel()

	for key, mutate := range map[string]func(*dtos.Entry){
		"time_length":       func(e *dtos.Entry) { e.TimeLength = "" },
		"correct_questions": func(e *dtos.Entry) { e.CorrectQuestions = 0 },
		"user_id":           func(e *dtos.Entry) { e.UserID = 0 },
		"notes_per_minute":  func(e *dtos.Entry) { e.NPM = 0 },
	} {
		t.Run(key, func(t *testing.T) {
			t.Parallel()
			entry := validEntry()
			mutate(&entry)

			problems := entry.Valid(context.Background())

			assert.NotEmpty(t, problems[key])
		})
	}
}

// TotalQuestions has no presence rule. The switch case that was meant to
// report it is spelled "Questions", so it never matched the field and a
// zero total has always been accepted. Pinned here so the day someone
// fixes it, this test fails and says so.
func TestEntryValid_AcceptsAZeroTotalQuestions(t *testing.T) {
	t.Parallel()

	entry := validEntry()
	entry.TotalQuestions = 0
	entry.CorrectQuestions = 0

	assert.Empty(t, entry.Valid(context.Background()))
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd core-api && go test ./tests/ -run TestEntryValid -count=1`
Expected: FAIL to build, with `entry.Valid undefined`.

- [ ] **Step 3: Rewrite `entry_dto.go`**

Replace the import block and `ValidateEntry` with:

```go
import (
	"context"
	"database/sql"

	"sight-reading/validations"
)
```

```go
// Valid checks a submitted score entry.
//
// TotalQuestions has no presence rule on purpose. The tag said
// `required`, but the switch that turned tag failures into messages
// spelled the case "Questions" while the field is "TotalQuestions", so
// the failure produced no message -- and when it was the only failure the
// method returned nil. Reproducing that as "no rule" keeps the behavior
// and removes the branch that could report success on a failed entry.
//
// FIXME: TotalQuestions should require a positive value. Adding it is a
// behavior change, so it is tracked separately.
func (entry Entry) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	switch {
	case entry.TimeLength == "":
		problems["time_length"] = "TimeLength: Time length is required"
	case !validations.EntryTimeLength(entry.TimeLength):
		problems["time_length"] = "TimeLength: Time must be in the 23:59:59 format (militaty time)"
	}

	// The business rule outranks the presence rule: a caller who sent
	// more correct answers than questions needs to hear that, not that a
	// field is missing.
	switch {
	case entry.CorrectQuestions > entry.TotalQuestions:
		problems["correct_questions"] = "CorrectQuestions: Correct questions cannot be more than total questions"
	case entry.CorrectQuestions == 0:
		problems["correct_questions"] = "CorrectQuestions: the amount of correct questions are required"
	}

	if entry.UserID == 0 {
		problems["user_id"] = "UserID: ID is required"
	}

	if entry.NPM == 0 {
		problems["notes_per_minute"] = "NPM: notes per minute is required"
	}

	return problems
}
```

Keep the four existing `FIXME` comments on the struct fields at lines 19-31 exactly where they are.

- [ ] **Step 4: Update the three callers**

`core-api/controllers/note_game_controller.go:36`:

```go
entry, problems, err := httpx.DecodeValid[dtos.Entry](r)
if err != nil {
	httpx.DecodeError(w, problems)
	return
}
```

`core-api/services/note_game_service.go:34`: delete the whole
`if err := entry.ValidateEntry(); err != nil { ... }` block and the
`// Validate entry data` comment above it. Update the function's doc
comment: it says "Validates entry data and authorization before saving",
which is no longer true. Make it "Checks authorization and saves a note
game entry. The body is validated at decode."

`core-api/generation/insert_data.go:30`:

```go
if len(entry.Valid(context.Background())) > 0 {
	continue
}
```

Add `"context"` to that file's imports if it is not already there.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd core-api && go test ./... -count=1`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /home/noetrevino/projects/tremolo2
make check-go
git add core-api
git commit -m "refactor(core-api): validate the score entry at decode

Drops go-playground from entry_dto. The nested switch it needed had a
case spelled \"Questions\" for a field named TotalQuestions, so a failure
on that field appended no message -- and when it was the only failure,
ValidateEntry returned nil and reported an invalid entry as valid.

The replacement has no TotalQuestions rule at all, which is the same
behavior with the silent-success path gone. The FIXME says what the rule
should become.

The three service tests that proved these rules moved down to the DTO.
They no longer need a database to check a string format."
```

---

### Task 5: `auth_dtos.go`

**Files:**
- Modify: `core-api/DTOs/auth_dtos.go`
- Modify: `core-api/controllers/auth_controller.go:53,80,131,190,265`
- Modify: `core-api/services/auth_service.go:41,147`
- Modify: `core-api/services/google_auth_service.go:40,153`
- Test: `core-api/tests/auth_service_test.go`, `core-api/tests/google_auth_test.go`

**Interfaces:**
- Consumes: `httpx.DecodeValid`, `httpx.DecodeError`, `validations.IsEmail`, `validations.IsURL`, `validations.PasswordComplexity(string)`.
- Produces: `dtos.LoginRequest.Valid`, `dtos.RegisterRequest.Valid`, `dtos.GoogleCallbackRequest.Valid`, `controllers.refreshTokenRequest`.

- [ ] **Step 1: Move the auth validation tests down to the DTO**

Delete `TestLogin_ValidationErrors` from `core-api/tests/auth_service_test.go:147`,
`TestRegister_ValidationErrors` from `core-api/tests/auth_service_test.go:316`, and
`TestGoogleCallbackService_ValidationError` from `core-api/tests/google_auth_test.go:467`.

Create `core-api/tests/auth_dto_test.go`:

```go
package tests

import (
	"context"
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
		"unknown role":   {func(r *dtos.RegisterRequest) { r.Role = "ADMIN" }, "role", "Role must be one of: STUDENT, TEACHER, PARENT"},
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd core-api && go test ./tests/ -run 'RequestValid' -count=1`
Expected: FAIL to build, with `req.Valid undefined`.

- [ ] **Step 3: Rewrite the three `Valid` methods**

In `core-api/DTOs/auth_dtos.go`, replace the import block with:

```go
import (
	"context"

	"sight-reading/validations"
)
```

Replace `ValidateLoginRequest`:

```go
func (req LoginRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	switch {
	case req.Email == "":
		problems["email"] = "Email is required"
	case !validations.IsEmail(req.Email):
		problems["email"] = "Email must be a valid email address"
	}

	problems = addPasswordProblem(problems, req.Password)

	return problems
}

// addPasswordProblem applies the password rules Login and Register share.
// Both routes must reject the same passwords, and the copy is the same
// sentence on each, so the rule lives once.
func addPasswordProblem(problems map[string]string, password string) map[string]string {
	switch {
	case password == "":
		problems["password"] = "Password is required"
	case len(password) < 8:
		problems["password"] = "Password must be at least 8 characters"
	case !validations.PasswordComplexity(password):
		problems["password"] = "Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character"
	}
	return problems
}
```

Replace `ValidateRegisterRequest`:

```go
// registerRoles are the roles a self-service signup may claim. ADMIN is
// absent on purpose: an admin is created by another admin.
var registerRoles = map[string]bool{
	"STUDENT": true,
	"TEACHER": true,
	"PARENT":  true,
}

func (req RegisterRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	switch {
	case req.Email == "":
		problems["email"] = "Email is required"
	case !validations.IsEmail(req.Email):
		problems["email"] = "Email must be a valid email address"
	}

	problems = addPasswordProblem(problems, req.Password)

	switch {
	case req.FirstName == "":
		problems["first_name"] = "First name is required"
	case len(req.FirstName) < 2:
		problems["first_name"] = "First name must be at least 2 characters"
	}

	switch {
	case req.LastName == "":
		problems["last_name"] = "Last name is required"
	case len(req.LastName) < 2:
		problems["last_name"] = "Last name must be at least 2 characters"
	}

	switch {
	case req.Role == "":
		problems["role"] = "Role is required"
	case !registerRoles[req.Role]:
		problems["role"] = "Role must be one of: STUDENT, TEACHER, PARENT"
	}

	return problems
}
```

Replace `ValidateGoogleCallbackRequest`:

```go
func (req GoogleCallbackRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	// Code has one message for every failure, which is what the tag-based
	// version did: its switch had no per-tag branch.
	if req.Code == "" {
		problems["code"] = "Authorization code is required"
	}

	switch {
	case req.RedirectURI == "":
		problems["redirect_uri"] = "Redirect URI is required"
	case !validations.IsURL(req.RedirectURI):
		problems["redirect_uri"] = "Redirect URI must be a valid URL"
	}

	return problems
}
```

Delete the `// TODO: move validation out of this package` comment at the
top of the file only if the file no longer imports the library. It still
describes a real wish, so keep it otherwise.

- [ ] **Step 4: Name the refresh-token body and give it a `Valid` method**

In `core-api/controllers/auth_controller.go`, add above `handleRefreshToken`:

```go
// refreshTokenRequest is the POST /api/auth/refresh body. It is a named
// type rather than an anonymous struct because a Valid method cannot hang
// on an anonymous one.
type refreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

func (r refreshTokenRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if r.RefreshToken == "" {
		problems["refresh_token"] = "Refresh token is required"
	}

	return problems
}
```

Replace the decode block inside `handleRefreshToken`. This handler does
**not** call `DecodeError`: a malformed body and a missing token have
always produced the same message here, so both paths keep it.

```go
reqBody, _, err := httpx.DecodeValid[refreshTokenRequest](r)
if err != nil {
	httpx.JSON(w, http.StatusBadRequest, httpx.M{"error": "Refresh token is required"})
	return
}
```

- [ ] **Step 5: Switch the other four auth decode sites**

At lines 53, 80, 131 and 190 of `core-api/controllers/auth_controller.go`, each block becomes:

```go
reqBody, problems, err := httpx.DecodeValid[dtos.GoogleCallbackRequest](r)
if err != nil {
	httpx.DecodeError(w, problems)
	return
}
```

Use `dtos.LoginRequest` at the login site and `dtos.RegisterRequest` at the register site.

Add `"context"` to the file's imports.

- [ ] **Step 6: Delete the four service-layer guards**

Remove the `if err := req.ValidateXxx(); err != nil { return nil, validationErr(err) }`
block from `core-api/services/auth_service.go` at lines 41 and 147, and
from `core-api/services/google_auth_service.go` at lines 40 and 153.

Check afterwards whether `validationErr` and `services.ErrValidation` still
have callers. Run `grep -rn "validationErr\|ErrValidation" core-api`. Leave
both in place if anything still uses them; the class and admin services do.

- [ ] **Step 7: Run the tests to verify they pass**

Run: `cd core-api && go test ./... -count=1`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
cd /home/noetrevino/projects/tremolo2
make check-go
git add core-api
git commit -m "refactor(core-api): validate the auth bodies at decode

Drops go-playground from auth_dtos. The three methods it backed shared a
nested switch per request shape; the password rules Login and Register
share now live in one helper instead of two copies.

The refresh-token body becomes a named refreshTokenRequest, because a
Valid method cannot hang on an anonymous struct. Its 400 keeps the single
\"Refresh token is required\" message for both a malformed body and a
missing token, which is what it answered before.

The service-layer validation tests moved down to the DTO. They no longer
set up a database to check a password rule."
```

---

### Task 6: `user_dto.go` and `district_dto.go`

**Files:**
- Modify: `core-api/DTOs/user_dto.go`
- Modify: `core-api/DTOs/district_dto.go`
- Modify: `core-api/controllers/admin_controller.go:77`
- Modify: `core-api/services/teacher_service.go:24`
- Modify: `core-api/generation/gen_utilities.go:423`
- Test: `core-api/tests/user_test.go`, `core-api/tests/district_test.go`, `core-api/tests/teacher_service_test.go`

**Interfaces:**
- Consumes: `httpx.DecodeValid`, `validations.IsAlpha`, `validations.IsAlphaNumUnicode`, `validations.IsEmail`, `validations.VarChar255Length(string)`, `validations.UserRole(string)`, `validations.PasswordComplexity(string)`.
- Produces: `dtos.User.Valid`, `dtos.CreateUserRequest.Valid`, `dtos.School.Valid`.

`POST /user` is the one route that does **not** use `httpx.DecodeError`. It answers 422 with two extra body keys. Keep its own mapping.

- [ ] **Step 1: Write the failing tests**

Delete `TestCreateUser_ValidationError` from `core-api/tests/teacher_service_test.go:71`.

Replace `core-api/tests/user_test.go`:

```go
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
```

Replace `core-api/tests/district_test.go`:

```go
package tests

import (
	"context"
	"testing"

	dtos "sight-reading/DTOs"

	"github.com/stretchr/testify/assert"
)

func validSchool() dtos.School {
	return dtos.School{
		Title:   "Lincoln9",
		City:    "Austin",
		County:  "Travis",
		State:   "Texas",
		Country: "USA",
	}
}

func TestSchoolValid_AcceptsAGoodSchool(t *testing.T) {
	t.Parallel()

	assert.Empty(t, validSchool().Valid(context.Background()))
}

func TestSchoolValid_RejectsMissingFields(t *testing.T) {
	t.Parallel()

	for key, mutate := range map[string]func(*dtos.School){
		"title":   func(s *dtos.School) { s.Title = "" },
		"county":  func(s *dtos.School) { s.County = "" },
		"state":   func(s *dtos.School) { s.State = "" },
		"country": func(s *dtos.School) { s.Country = "" },
	} {
		t.Run(key, func(t *testing.T) {
			t.Parallel()
			school := validSchool()
			mutate(&school)

			assert.NotEmpty(t, school.Valid(context.Background())[key])
		})
	}
}

// City has a tag but never had a switch case, and Title's case tested for
// the tag "alphanum" while the field carries "alphanumunicode". Neither
// failure ever produced a message, so neither field has a working format
// rule. Pinned so a future fix has to say so out loud.
func TestSchoolValid_HasNoFormatRuleForTitleOrCity(t *testing.T) {
	t.Parallel()

	school := validSchool()
	school.Title = "Lincoln High #9"
	school.City = "Austin 3"

	assert.Empty(t, school.Valid(context.Background()))
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd core-api && go test ./tests/ -run 'UserValid|SchoolValid|CreateUserRequestValid' -count=1`
Expected: FAIL to build, with `Valid undefined`.

- [ ] **Step 3: Rewrite `user_dto.go`**

Replace the import block, delete `userFieldMessages`, `newUserValidator`
and `validateUserShape`, and replace the two methods:

```go
import (
	"context"
	"database/sql"

	"sight-reading/validations"
)
```

```go
// userShapeProblems holds the field rules User and CreateUserRequest
// share. The two shapes differ only by Password, so the common rules live
// here rather than in two copies that can drift.
//
// The "SchooolID" spelling below is intentional. It is the message this
// API has always sent.
func userShapeProblems(firstName, lastName string, role Role, email string, schoolID int16) map[string]string {
	problems := map[string]string{}

	switch {
	case firstName == "":
		problems["first_name"] = "FirstName: first name is required"
	case !validations.IsAlpha(firstName):
		problems["first_name"] = "FirstName: must be only alphabetical charaters"
	case !validations.VarChar255Length(firstName):
		problems["first_name"] = "FirstName: must be shorter than 255 characters"
	}

	switch {
	case lastName == "":
		problems["last_name"] = "LastName: last name is required"
	case !validations.IsAlpha(lastName):
		problems["last_name"] = "LastName: must be only alphabetical charaters"
	case !validations.VarChar255Length(lastName):
		problems["last_name"] = "LastName: must be shorter than 255 characters"
	}

	switch {
	case role == "":
		problems["role"] = "Role: required when making a user"
	case !validations.UserRole(string(role)):
		problems["role"] = "Role: must be one of STUDENT, TEACHER, PARENT, or ADMIN"
	}

	switch {
	case email == "":
		problems["email"] = "Email: email is required"
	case !validations.IsEmail(email):
		problems["email"] = "Email: must be correctly formatted"
	case !validations.VarChar255Length(email):
		problems["email"] = "Email: must be shorter than 255 characters"
	}

	if schoolID == 0 {
		problems["school_id"] = "SchoolID: required when making a user"
	}

	return problems
}

// Valid checks a User's field shape. The fake-data generator is its
// remaining caller; request bodies use CreateUserRequest.
func (user User) Valid(ctx context.Context) map[string]string {
	return userShapeProblems(user.FirstName, user.LastName, user.Role, user.Email, user.SchoolID)
}

// Valid applies the same field rules as User.Valid, plus the password
// rules a created user needs.
func (req CreateUserRequest) Valid(ctx context.Context) map[string]string {
	problems := userShapeProblems(req.FirstName, req.LastName, req.Role, req.Email, req.SchoolID)

	switch {
	case req.Password == "":
		problems["password"] = "Password: password is required"
	case len(req.Password) < 8:
		problems["password"] = "Password: must be at least 8 characters"
	case !validations.PasswordComplexity(req.Password):
		problems["password"] = "Password: must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character"
	}

	return problems
}
```

Delete the `validate:` struct tags from both `User` and `CreateUserRequest`.
Keep the `db:` and `json:` tags. Keep the doc comment on
`CreateUserRequest` explaining why it is separate from `User`.

- [ ] **Step 4: Rewrite `district_dto.go`**

```go
import (
	"context"
	"database/sql"

	"sight-reading/validations"
)
```

```go
// Valid checks a School's field shape.
//
// Title and City have no format rule, which reproduces existing behavior
// rather than adding one. Title's message switch tested for the tag
// "alphanum" while the field carried "alphanumunicode", and City had a
// tag but no case at all, so neither failure ever produced a message --
// and a message-less failure made ValidateSchool return nil.
//
// FIXME: Title should require alphanumeric text and City should require
// alphabetical text. Both are behavior changes, tracked separately.
func (school School) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	switch {
	case school.Title == "":
		problems["title"] = "Title: title is required"
	case !validations.VarChar255Length(school.Title):
		problems["title"] = "Title: must be shorter than 255 characters"
	}

	for _, field := range []struct {
		key      string
		value    string
		required string
		alpha    string
		tooLong  string
	}{
		{"county", school.County, "County amount is required", "County: title must be alpha", "County: must be shorter than 255 characters"},
		{"state", school.State, "State questions are required", "State: title must be alpha", "State: must be shorter than 255 characters"},
		{"country", school.Country, "Country is required", "Country: title must be alpha", "Country: must be shorter than 255 characters"},
	} {
		switch {
		case field.value == "":
			problems[field.key] = field.required
		case !validations.IsAlpha(field.value):
			problems[field.key] = field.alpha
		case !validations.VarChar255Length(field.value):
			problems[field.key] = field.tooLong
		}
	}

	return problems
}
```

Delete the `validate:` struct tags from `School` and the
`// TODO: add varchar constraints` comment above the old method.

- [ ] **Step 5: Update the callers**

`core-api/controllers/admin_controller.go:77`. This handler keeps its own
mapping: it answers 422, not 400, and its body carries `message` and
`scenario` keys.

```go
reqBody, problems, err := httpx.DecodeValid[dtos.CreateUserRequest](r)
if err != nil {
	if len(problems) > 0 {
		httpx.JSON(w, http.StatusUnprocessableEntity, httpx.M{
			"error":    httpx.ProblemsError(problems),
			"message":  "Information invalid",
			"scenario": "TS.2",
		})
		return
	}
	httpx.JSON(w, http.StatusUnprocessableEntity, httpx.M{
		"error":    true,
		"message":  "Invalid json body",
		"scenario": "TS.1",
	})
	return
}
```

Then delete the `case errors.Is(err, services.ErrValidation):` arm from the
switch below it, because the service no longer returns that error for this
request. Check whether `strings` is still imported and used in that file.

`core-api/services/teacher_service.go:24`: delete the
`if err := req.Validate(); err != nil { ... }` block.

`core-api/generation/gen_utilities.go:423`:

```go
if problems := user.Valid(context.Background()); len(problems) > 0 {
	log.Printf("User validation failed (attempt %d/%d): %v", attempt+1, maxRetries, problems)
	continue
}
```

Add `"context"` to that file's imports.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd core-api && go test ./... -count=1`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd /home/noetrevino/projects/tremolo2
make check-go
git add core-api
git commit -m "refactor(core-api): validate the user and school shapes by hand

Drops go-playground from user_dto and district_dto. The message table
that mapped (field, tag) pairs back to sentences is gone: the sentence
now sits next to the check that produces it.

district_dto had the same dead-branch bug as entry_dto, twice. Title's
switch tested for the tag \"alphanum\" while the field carried
\"alphanumunicode\", and City had a tag but no case at all, so neither
failure ever produced a message and a message-less failure returned nil.
Neither field gets a format rule here; the FIXME says what it should be.

POST /user keeps its own error mapping. It answers 422 with two extra
body keys, so it cannot use the shared httpx.DecodeError."
```

---

### Task 7: `keyboard_bindings_dto.go` and `note_game_settings_dto.go`

This task removes the last `validate:` tag and the last library import from the DTO package.

**Files:**
- Modify: `core-api/DTOs/keyboard_bindings_dto.go`
- Modify: `core-api/DTOs/note_game_settings_dto.go`
- Modify: `core-api/controllers/keyboard_bindings_controller.go:56,65`
- Modify: `core-api/controllers/note_game_settings_controller.go:52`
- Modify: `core-api/services/keyboard_bindings_service.go:13-25,59`
- Modify: `core-api/services/note_game_settings_service.go:29`
- Test: `core-api/tests/keyboard_bindings_dto_test.go`

**Interfaces:**
- Consumes: `httpx.DecodeValid`, `httpx.DecodeError`.
- Produces: `dtos.KeyboardBindingsRequest.Valid`, `dtos.NoteGameSettingsRequest.Valid`. `services.ValidationError` is deleted.

- [ ] **Step 1: Update the keyboard bindings tests**

In `core-api/tests/keyboard_bindings_dto_test.go`, replace each
`err := req.Validate()` with `problems := req.Valid(context.Background())`
and adjust the assertions. The eight call sites are at lines 23, 38, 59,
74, 89, 102, 115 and 130. A failure assertion becomes:

```go
problems := req.Valid(context.Background())
assert.NotEmpty(t, problems["key_c"])
```

A success assertion becomes `assert.Empty(t, problems)`. The duplicate-key
assertion at line 117 becomes:

```go
assert.Contains(t, problems["key_bindings"], "duplicate key assignment")
```

The three-key assertion at lines 132-134 checks three separate map keys:

```go
assert.NotEmpty(t, problems["key_c"])
assert.NotEmpty(t, problems["key_a"])
assert.NotEmpty(t, problems["key_g_sharp"])
```

Add `"context"` to the file's imports.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd core-api && go test ./tests/ -run KeyboardBindings -count=1`
Expected: FAIL to build, with `req.Valid undefined`.

- [ ] **Step 3: Rewrite `keyboard_bindings_dto.go`**

Replace the import block with:

```go
import (
	"context"
	"fmt"
)
```

Delete every `validate:` tag from `KeyBindings` and
`KeyboardBindingsRequest`. Replace the `Validate` method with:

```go
// bindingFields lists every note, its JSON field name, and a reader for
// its value. Twenty-one fields with identical rules do not deserve
// twenty-one copies of the same three lines, and the duplicate-key check
// needs the same list anyway.
func (kb KeyBindings) bindingFields() []struct {
	note  string
	key   string
	value string
} {
	return []struct {
		note  string
		key   string
		value string
	}{
		{"C", "key_c", kb.KeyC},
		{"D", "key_d", kb.KeyD},
		{"E", "key_e", kb.KeyE},
		{"F", "key_f", kb.KeyF},
		{"G", "key_g", kb.KeyG},
		{"A", "key_a", kb.KeyA},
		{"B", "key_b", kb.KeyB},
		{"C#", "key_c_sharp", kb.KeyCSharp},
		{"D#", "key_d_sharp", kb.KeyDSharp},
		{"E#", "key_e_sharp", kb.KeyESharp},
		{"F#", "key_f_sharp", kb.KeyFSharp},
		{"G#", "key_g_sharp", kb.KeyGSharp},
		{"A#", "key_a_sharp", kb.KeyASharp},
		{"B#", "key_b_sharp", kb.KeyBSharp},
		{"Cb", "key_c_flat", kb.KeyCFlat},
		{"Db", "key_d_flat", kb.KeyDFlat},
		{"Eb", "key_e_flat", kb.KeyEFlat},
		{"Fb", "key_f_flat", kb.KeyFFlat},
		{"Gb", "key_g_flat", kb.KeyGFlat},
		{"Ab", "key_a_flat", kb.KeyAFlat},
		{"Bb", "key_b_flat", kb.KeyBFlat},
	}
}

// fieldName turns a JSON key like "key_c_sharp" back into the Go field
// name "KeyCSharp", because the messages name the Go field.
func fieldName(jsonKey string) string {
	out := ""
	for _, part := range strings.Split(jsonKey, "_") {
		out += strings.ToUpper(part[:1]) + part[1:]
	}
	return out
}

func (r KeyboardBindingsRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	fields := r.KeyBindings.bindingFields()
	for _, f := range fields {
		switch {
		case f.value == "":
			problems[f.key] = fmt.Sprintf("%s: is required", fieldName(f.key))
		case len(f.value) > 20:
			problems[f.key] = fmt.Sprintf("%s: must be at most 20 characters", fieldName(f.key))
		}
	}

	// The duplicate check only runs on a fully populated set. Two empty
	// keys are not a duplicate assignment, they are two missing fields,
	// and reporting both would bury the real problem.
	if len(problems) > 0 {
		return problems
	}

	seen := map[string]string{}
	for _, f := range fields {
		if _, exists := seen[f.value]; exists {
			problems["key_bindings"] = fmt.Sprintf("duplicate key assignment: key '%s' is assigned to multiple notes", f.value)
			return problems
		}
		seen[f.value] = f.note
	}

	return problems
}
```

Add `"strings"` to that file's imports.

- [ ] **Step 4: Rewrite `note_game_settings_dto.go`**

Replace the import block with:

```go
import (
	"context"
	"regexp"
)
```

Delete every `validate:` tag from `NoteGameSettingsRequest`. Replace the
`Validate` method with:

```go
// naturalNote matches range endpoints like "C4" or "F3" (no accidentals).
var naturalNote = regexp.MustCompile(`^[A-G][0-9]$`)

var (
	validGameModes  = map[string]bool{"time": true, "notes": true}
	validTimeLimits = map[int]bool{15: true, 30: true, 60: true, 120: true}
	validNoteLimits = map[int]bool{10: true, 25: true, 50: true, 100: true}
	validClefs      = map[string]bool{"treble": true, "bass": true}
)

func (r NoteGameSettingsRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if !validGameModes[r.GameMode] {
		problems["game_mode"] = "GameMode: must be 'time' or 'notes'"
	}
	if !validTimeLimits[r.TimeLimit] {
		problems["time_limit"] = "TimeLimit: must be 15, 30, 60, or 120"
	}
	if !validNoteLimits[r.NoteLimit] {
		problems["note_limit"] = "NoteLimit: must be 10, 25, 50, or 100"
	}
	if r.Scale == "" {
		problems["scale"] = "Scale: is required"
	}
	if r.Octave < 1 || r.Octave > 9 {
		problems["octave"] = "Octave: must be between 1 and 9"
	}
	if !naturalNote.MatchString(r.LowNote) {
		problems["low_note"] = "LowNote: must be a natural note like C4"
	}
	if !naturalNote.MatchString(r.HighNote) {
		problems["high_note"] = "HighNote: must be a natural note like C4"
	}
	if !validClefs[r.Clef] {
		problems["clef"] = "Clef: must be 'treble' or 'bass'"
	}

	return problems
}
```

- [ ] **Step 5: Update the controllers and delete `services.ValidationError`**

`core-api/controllers/keyboard_bindings_controller.go:56`:

```go
req, problems, err := httpx.DecodeValid[dtos.KeyboardBindingsRequest](r)
if err != nil {
	httpx.DecodeError(w, problems)
	return
}
```

Then delete the `var validationErr *services.ValidationError` arm from the
error switch below it, leaving the logger call and the 500.

`core-api/controllers/note_game_settings_controller.go:52`:

```go
req, problems, err := httpx.DecodeValid[dtos.NoteGameSettingsRequest](r)
if err != nil {
	httpx.DecodeError(w, problems)
	return
}
```

`core-api/services/keyboard_bindings_service.go`: delete the
`ValidationError` type and its two methods at lines 13-25, and the
`if err := req.Validate(); err != nil { ... }` block at line 59.

`core-api/services/note_game_settings_service.go:29`: delete the
`if err := req.Validate(); err != nil { ... }` block.

Run `grep -rn "ValidationError" core-api --include='*.go'` afterwards. Only
test function *names* should match.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd core-api && go test ./... -count=1`
Expected: PASS.

- [ ] **Step 7: Verify no struct tags remain**

Run: `grep -rn 'validate:"' core-api`
Expected: no output.

- [ ] **Step 8: Commit**

```bash
cd /home/noetrevino/projects/tremolo2
make check-go
git add core-api
git commit -m "refactor(core-api): validate the keyboard and note-game bodies by hand

Removes the last validate: struct tag from the service. The twenty-one
keyboard fields carried identical rules and now share one table, which
the duplicate-key check already needed.

services.ValidationError existed only to carry a validation error up from
UpsertKeyboardBindings so the controller could unwrap it. The controller
sees the problems directly now, so the type goes."
```

---

### Task 8: Drop the dependency

**Files:**
- Modify: `core-api/validations/validations.go`
- Modify: `core-api/go.mod`, `core-api/go.sum`
- Modify: `core-api/CLAUDE.md`
- Modify: `core-api/README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing new.

- [ ] **Step 1: Delete the tag adapters**

From `core-api/validations/validations.go`, delete `entryTimeLengthTag`,
`varChar255LengthTag`, `userRoleTag`, `passwordComplexityTag`, the
`TagRules` map, the comment block above them, and the
`"github.com/go-playground/validator/v10"` import.

- [ ] **Step 2: Verify the dependency is unreferenced**

Run: `grep -rn "go-playground" core-api --include='*.go'`
Expected: no output.

- [ ] **Step 3: Drop it from the module**

Run: `cd core-api && go mod tidy`
Then: `grep -n "go-playground" core-api/go.mod core-api/go.sum`
Expected: no output.

- [ ] **Step 4: Update the service docs**

In `core-api/CLAUDE.md` and `core-api/README.md`, find any sentence that
names go-playground, `validator`, or `validate:` struct tags. Replace it
with a description of the current design. Read both files first; do not
guess at the wording. The replacement should say:

> Request bodies validate themselves. Each request DTO has a
> `Valid(ctx context.Context) map[string]string` method returning problems
> keyed by JSON field name, and controllers call `httpx.DecodeValid`, which
> decodes and validates in one step. The `[T Validator]` constraint on that
> function makes a request shape without a `Valid` method a build error.
> Services take already-valid input.

- [ ] **Step 5: Run the full suite**

Run: `cd /home/noetrevino/projects/tremolo2 && make check-go`
Expected: PASS.

Then run the race detector, which CI uses and `make check-go` may not:

Run: `cd core-api && go test ./... -race -count=1`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /home/noetrevino/projects/tremolo2
git add core-api
git commit -m "chore(core-api): drop the go-playground/validator dependency

Nothing imports it. The tag adapters that bridged the migration go with
it.

CLAUDE.md and README.md now describe the Valid/DecodeValid design."
```

---

## Post-implementation review notes

Hand these to the reviewer along with the branch.

**The one behavior change that reaches users.** Validation failures on the
note-game-settings route and the class routes now answer with the field
detail instead of a generic string. The frontend prints `body.error`
straight into the UI (`frontend/src/app/shared/utils/error.utils.ts:19`), so
a user sees "Clef: must be 'treble' or 'bass'" where they used to see
"Failed to update settings". Statuses do not change.

**Three bugs are pinned, not fixed.** Each has a test asserting the buggy
behavior and a FIXME naming the fix:

- `Entry.TotalQuestions` has no presence rule.
- `Entry.CorrectQuestions` rejects a legitimate score of 0.
- `School.Title` and `School.City` have no format rule.

**One deliberate tightening.** `validations.IsEmail` requires a dot in the
domain. The library accepted `user@localhost`. If any fixture or seed uses
a dotless address, this rejects it. Task 2's test pins the intent.
