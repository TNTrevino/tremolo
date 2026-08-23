# Replace go-playground/validator with a `Valid` interface

Date: 2026-08-22
Service: `core-api`
Status: approved design, not yet implemented

## Goal

Remove `github.com/go-playground/validator/v10` from `core-api`. Replace it
with hand-written validation, following the pattern in Mat Ryer's article
"How I write HTTP services in Go after 13 years" (Grafana, 2024).

## Why

The service uses the library sparingly and pays for it twice. Each call
site builds a fresh `validator.New()`, registers custom rules, runs the
struct, then translates opaque `(StructField, Tag)` pairs back into
sentences through a nested switch. The switch is the real cost. One case
in `DTOs/entry_dto.go:92` is spelled `"Questions"` where the field is
`TotalQuestions`, so it never matches, and a failure on that field alone
makes `ValidateEntry` return `nil`. A hand-written check cannot fail that
way.

Four DTOs already validate by hand with no library (`class_dto.go`,
`game_settings_dto.go`, `assignment_dto.go`, and the duplicate-key rule in
`keyboard_bindings_dto.go`). This work makes the other six match them.

## Current state

### Where the library appears

| File | Use |
| --- | --- |
| `core-api/validations/validations.go` | 4 custom rules with `validator.FieldLevel` signatures |
| `core-api/DTOs/auth_dtos.go` | `LoginRequest`, `RegisterRequest`, `GoogleCallbackRequest` |
| `core-api/DTOs/user_dto.go` | `User`, `CreateUserRequest` |
| `core-api/DTOs/entry_dto.go` | `Entry` |
| `core-api/DTOs/district_dto.go` | `School` |
| `core-api/DTOs/keyboard_bindings_dto.go` | `KeyboardBindingsRequest` |
| `core-api/DTOs/note_game_settings_dto.go` | `NoteGameSettingsRequest` |
| `core-api/go.mod` | the dependency line |

### Tags in use

`required`, `alpha`, `alphanumunicode`, `email`, `url`, `number`, `min`,
`max`, `oneof`, plus the custom tags `role`, `len255`,
`password_complexity`, `time` and `natural_note`.

### Where validation runs

The service layer calls the validate method. The controller only decodes.
Ten service call sites exist, listed in the implementation section below.

### Method names today

`Validate()`, `ValidateEntry()`, `ValidateSchool()`, `ValidateUser()`,
`ValidateLoginRequest()`, `ValidateRegisterRequest()` and
`ValidateGoogleCallbackRequest()`.

## Design

### The interface

`core-api/httpx/httpx.go` gains the article's interface, unchanged:

```go
// Validator is a request body that can check itself. An empty problems
// map means the body is valid.
type Validator interface {
	Valid(ctx context.Context) (problems map[string]string)
}
```

The method is named `Valid`, takes a `context.Context`, and returns a map
of JSON field name to problem text. The context exists so a rule can reach
the database. No rule needs it today. A uniqueness check on an email, or a
role lookup, is the kind of rule that would.

Every `Valid` method uses a **value receiver**:

```go
func (r LoginRequest) Valid(ctx context.Context) map[string]string
```

A pointer receiver would force call sites to write
`DecodeValid[*dtos.LoginRequest](r)`, and a JSON body of `null` would
leave the pointer nil and panic inside the method call. A value receiver
also satisfies the interface for `*T`, so it is strictly more flexible.

### The decode helper

`Decode[T any]` stays exactly as it is. A second function sits next to it:

```go
// DecodeValid reads a JSON request body into a fresh T and runs its
// Valid method. The [T Validator] constraint is the point: a request
// shape that forgets Valid fails the build here, not at runtime.
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
```

This is the article's `decodeValid`, exported and renamed to match the
package's existing `Decode`. The type constraint is why it is a separate
function rather than a runtime type assertion inside `Decode`: the
compiler rejects a DTO with no `Valid` method.

### The response helper

The wire format does not change. The map is joined into today's
`{"error": "..."}` string:

```go
// ProblemsError renders a Valid problems map as the single error string
// the API has always returned. Keys are sorted: Go map order is random,
// and a response body that reorders itself between identical requests is
// not acceptable.
func ProblemsError(problems map[string]string) string {
	keys := slices.Sorted(maps.Keys(problems))
	out := make([]string, 0, len(keys))
	for _, k := range keys {
		out = append(out, problems[k])
	}
	return strings.Join(out, ", ")
}

// DecodeError writes the 400 for a DecodeValid failure. A nil problems
// map means the body did not parse.
func DecodeError(w http.ResponseWriter, problems map[string]string) {
	if len(problems) == 0 {
		JSON(w, http.StatusBadRequest, M{"error": "Invalid request body"})
		return
	}
	JSON(w, http.StatusBadRequest, M{"error": ProblemsError(problems)})
}
```

### The rules

`core-api/validations/validations.go` keeps its four custom rules but
drops the `validator.FieldLevel` signature. Each becomes a plain
predicate over a `string`. The file also gains the primitives the struct
tags used to supply.

| Old tag | Replacement |
| --- | --- |
| `required` on a string | `s == ""` — the library's `required` does not trim, so neither does this |
| `required` on an int | `n == 0` |
| `required` on a nested struct | check the nested fields directly |
| `alpha` | `validations.IsAlpha(s)` — ASCII letters only, matching the library |
| `alphanumunicode` | `validations.IsAlphaNumUnicode(s)` — `unicode.IsLetter` or `unicode.IsNumber`, matching the library's `\p{L}\p{N}` |
| `email` | `validations.IsEmail(s)` — one regexp |
| `url` | `validations.IsURL(s)` — `net/url.ParseRequestURI` plus a scheme check |
| `min=8`, `max=20`, `len255` | `len(s)` comparisons |
| `oneof=a b c` | a package-level `map[string]bool` |
| `number` | **deleted** — the library returns true for every int field, so the tag is a no-op |
| `role` | `validations.UserRole(s string) bool` |
| `password_complexity` | `validations.PasswordComplexity(s string) bool` |
| `time` | `validations.EntryTimeLength(s string) bool` |
| `natural_note` | stays a private regexp in `note_game_settings_dto.go` |
| `len255` | `validations.VarChar255Length(s string) bool` |

### The DTO method shape

Every `Valid` follows one shape. The key is the JSON field name. The
value is the message the API returns today, verbatim:

```go
func (r NoteGameSettingsRequest) Valid(ctx context.Context) map[string]string {
	problems := map[string]string{}

	if !validNoteGameModes[r.GameMode] {
		problems["game_mode"] = "GameMode: must be 'time' or 'notes'"
	}
	if !validTimeLimits[r.TimeLimit] {
		problems["time_limit"] = "TimeLimit: must be 15, 30, 60, or 120"
	}
	// ...

	return problems
}
```

Messages stay byte-for-byte identical, including the "SchooolID" and
"charaters" spellings in `user_dto.go` and the dead `Questions` message in
`entry_dto.go`. Those are the strings the API has always sent.

## Scope decisions

### Known bugs stay

Two rules are wrong today. Both are reproduced exactly, with their FIXME
comments kept, and fixed in separate later work:

- `entry_dto.go:92` — the `"Questions"` switch case never matches the
  `TotalQuestions` field, so a `TotalQuestions` of 0 produces no message
  and `ValidateEntry` returns `nil`. In other words the field has no
  effective presence rule today. The rewrite reproduces that by **not
  checking `TotalQuestions` at all**, with a FIXME naming the missing
  rule. This is exact, and it avoids carrying the dead branch forward.
  The separate business rule `CorrectQuestions > TotalQuestions` is
  unaffected and stays.
- `entry_dto.go:23` — `required` on `CorrectQuestions` rejects a score of
  0, so a player who got nothing right cannot save the attempt.
- `district_dto.go` has the same dead-branch family. The `Title` switch
  tests for the tag `"alphanum"` while the field's tag is
  `alphanumunicode`, so a non-alphanumeric title produces no message. The
  `City` field has a tag but no switch case at all, so it produces no
  message either. Both fields therefore have no effective format rule
  today. The rewrite reproduces that and marks each with a FIXME. `School`
  is reachable only from the fake-data generator, not from HTTP.

### Behavior that does change

Three effects are accepted, not accidental.

1. **One problem per field.** A map holds one value per key. Today a
   field that fails two rules at once produces two messages. For example
   a `FirstName` of 300 digits fails both `alpha` and `len255` and
   returns both sentences. Under the map it returns the first rule that
   fails, in the order the rules are written: presence, then format, then
   length. The status code does not change.
2. **Message order becomes alphabetical.** Messages are joined in sorted
   JSON-field-name order rather than struct declaration order. Sorting is
   deliberate; Go map iteration order is random and would otherwise vary
   between identical requests.
3. **Validation-failure bodies become uniform.** Today
   `PUT /api/note-game/settings` answers a validation failure with
   `{"error":"Failed to update settings"}` and the class routes answer
   `{"error":"Invalid request"}`, because the detail is thrown away in the
   service layer. Under `DecodeError` every route answers with the field
   detail, which is what the auth routes already do. The frontend renders
   `body.error` directly (`frontend/src/app/shared/utils/error.utils.ts:19`),
   so a user sees "Clef: must be 'treble' or 'bass'" in place of
   "Failed to update settings". Statuses do not change.

   `POST /user` is the exception. It answers **422**, not 400, and its
   body carries two extra keys:
   `{"error": "<detail>", "message": "Information invalid", "scenario": "TS.2"}`
   (`controllers/admin_controller.go:88`). That handler keeps its own
   mapping and does not call `DecodeError`.
4. **The message separator becomes `", "` everywhere.** Today the auth
   DTOs join with `", "` and the user, entry and district DTOs join with
   `",\n"`. One helper cannot reproduce both. `", "` wins because the
   frontend renders the string into a toast, where an embedded newline
   reads badly. A single-field failure has no separator at all, which is
   the common case.

### Out of scope

- No frontend change. The wire format is preserved.
- No new validation rules.
- No change to `validations/http_params.go`. It does not import the library.

## Implementation

### Call sites that move

The service layer stops validating, because `DecodeValid` runs first.
These ten calls are removed:

| File | Line |
| --- | --- |
| `services/auth_service.go` | 41, 147 |
| `services/google_auth_service.go` | 40, 153 |
| `services/note_game_service.go` | 34 |
| `services/note_game_settings_service.go` | 29 |
| `services/game_settings_service.go` | 40 |
| `services/keyboard_bindings_service.go` | 59 |
| `services/class_service.go` | 73, 164 |
| `services/teacher_service.go` | 24 |
| `services/assignment_service.go` | 65 |

### Controller call sites

Thirteen `httpx.Decode` calls become `httpx.DecodeValid`. Two of them need
a named type first, because a method cannot hang on an anonymous struct or
keep an ad-hoc inline check:

- `controllers/auth_controller.go:265` — the anonymous refresh-token
  struct becomes a named `refreshTokenRequest` with a `Valid` method
  returning `{"refresh_token": "Refresh token is required"}`. Joined, that
  reproduces today's body exactly. The malformed-body path in this handler
  keeps its own message rather than using `DecodeError`.
- `controllers/friends_controller.go:79` — `addFriendRequest` gains a
  `Valid` method returning `{"friend_id": "Invalid request body"}`, which
  reproduces today's body and removes the inline `req.FriendID == 0`
  check.

### Non-HTTP call sites

The fake-data generator calls the methods directly and does not go through
HTTP. Both switch to `Valid` and test the map length:

- `generation/gen_utilities.go:423` — `user.ValidateUser()`
- `generation/insert_data.go:30` — `entry.ValidateEntry()`

### Tests

`core-api/tests/` asserts only error-or-no-error plus a few
`assert.Contains` checks on field names. The suite stays valid after the
rename. Files that need the new method name:

`tests/entry_test.go`, `tests/district_test.go`, `tests/user_test.go`,
`tests/keyboard_bindings_dto_test.go`, `tests/game_settings_service_test.go`,
`tests/config_validation_dto_test.go`.

Six test functions currently prove a rule by calling a **service** with an
invalid request. Once the service stops validating, they no longer prove
anything, so each moves down to a table test on the DTO's `Valid` method.
Each also drops its `testutil.SetupTestDB(t)` call, because a string rule
needs no database:

| File | Function |
| --- | --- |
| `tests/note_game_service_test.go:75` | `TestCreateNoteGameEntry_ValidationError_TimeFormat` |
| `tests/note_game_service_test.go:115` | `TestCreateNoteGameEntry_ValidationError_CorrectMoreThanTotal` |
| `tests/note_game_service_test.go:136` | `TestCreateNoteGameEntry_ValidationError_MissingFields` |
| `tests/auth_service_test.go:147` | `TestLogin_ValidationErrors` |
| `tests/auth_service_test.go:316` | `TestRegister_ValidationErrors` |
| `tests/teacher_service_test.go:71` | `TestCreateUser_ValidationError` |
| `tests/google_auth_test.go:467` | `TestGoogleCallbackService_ValidationError` |

New tests to write:

- `httpx/httpx_test.go` — `DecodeValid` returns the problems map, returns a
  nil map for a malformed body, and passes a valid body through.
  `ProblemsError` sorts its keys.
- `validations/` — table tests for `IsAlpha`, `IsAlphaNumUnicode`,
  `IsEmail` and `IsURL`, each including the inputs the library accepted.
- One table test per rewritten DTO covering every field rule, so the
  hand-written checks are pinned before the library leaves.

## Commit sequence

Each DTO commit is a vertical slice: the DTO, its rules, its service call
and its controller call move together. That is what keeps every commit
building. A commit that renamed a DTO method without moving its service
call would leave the service calling a method that no longer exists.

1. `feat(core-api)`: add `Validator`, `DecodeValid`, `ProblemsError` and
   `DecodeError` to `httpx`, with tests. Nothing calls them yet.
2. `refactor(core-api)`: rewrite every rule in `validations` as a plain
   `func(string) bool`, and add the primitives `IsAlpha`,
   `IsAlphaNumUnicode`, `IsEmail` and `IsURL`, with table tests. The four
   existing `validator.FieldLevel` functions become private `*Tag`
   adapters that delegate to the string forms, so the six DTOs still on
   struct tags keep building. This is the one place the signature clash
   is handled, rather than once per DTO commit.
3. `refactor(core-api)`: move the DTOs that already validate by hand onto
   `Valid` — `class_dto.go`, `game_settings_dto.go`, `assignment_dto.go`
   and `addFriendRequest`. No library is involved, so this proves the
   pattern end to end at the lowest risk.
4. `refactor(core-api)`: `entry_dto.go`. Touches
   `services/note_game_service.go`, `controllers/note_game_controller.go`
   and `generation/insert_data.go`.
5. `refactor(core-api)`: `auth_dtos.go`, and name `refreshTokenRequest`.
   Touches `services/auth_service.go`, `services/google_auth_service.go`
   and `controllers/auth_controller.go`.
6. `refactor(core-api)`: `user_dto.go` and `district_dto.go`. Touches
   `controllers/admin_controller.go` and `generation/gen_utilities.go`.
7. `refactor(core-api)`: `keyboard_bindings_dto.go` and
   `note_game_settings_dto.go`. This removes the last library import from
   the DTO package.
8. `chore(core-api)`: delete the `*Tag` adapters from `validations`, run
   `go mod tidy`, update `core-api/CLAUDE.md` and `core-api/README.md`.

## Verification

- `make check-go` after every commit.
- `go test ./... -race` for the full suite.
- `grep -rn 'validate:"' core-api` returns nothing after commit 7.
- `grep -r "go-playground" core-api` returns nothing after commit 8.
