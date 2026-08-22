# core-api: layering fix and Gin removal

Date: 2026-08-22
Status: approved (design agreed in session)

## Goal

Bring `core-api` to a consistent structure, then replace Gin with the
standard library `net/http`, following Mat Ryer's "How I write HTTP
services in Go after 13 years" (Grafana blog, 2024).

Three phases. Each phase is its own branch and its own effort:

1. `fix/admin-route-auth` — protect the admin routes.
2. `refactor/service-layering` — split old services into controller + service.
3. `refactor/stdlib-http` — remove Gin, adopt the Ryer structure.

## Background findings (2026-08-22 review)

- `controllers/controller.go` registers `/teachers`, `/teacher/:id`,
  `/students`, `/student/:id`, `POST /user` with no auth middleware.
  `POST /user` accepts `role: "ADMIN"`. No frontend consumer exists,
  but the routes stay: they back a planned frontend feature.
- Old services (`auth`, `teacher`, `admin`, `chart`, `google_auth`)
  take `*gin.Context`, bind JSON, write responses, and read the
  `database.Queries` global. This breaks the documented invariant:
  controller → service → `generated.Querier`.
- `DTOs/user_dto.go` tags `PasswordHash` with `json:"-"`, so
  `POST /user` always stores a NULL password.
- `controllers/user_info_controller.go:54` compares an error by a
  string that is never produced; the 404 branch is dead.
- `main.go` uses `router.Run` (no timeouts, no graceful shutdown).
- `middleware/auth_middleware.go` uses the raw string context key
  `"userID"` and panics in `getEnvInt` on the request path.

## Phase 1: `fix/admin-route-auth`

- Rename `controllers/controller.go` → `controllers/admin_controller.go`.
- Apply `middleware.AuthMiddleware()` to the group.
- Add an admin-only guard: a local `adminOnly(h gin.HandlerFunc)`
  wrapper in the controller that checks the caller's role via
  `GetUserRole` and returns 403 for non-admins. Decision: the whole
  group is ADMIN-only for now; the future feature may loosen this.
- `POST /user` (`services.CreateUser`) rejects `role: "ADMIN"` in the
  request body.
- The null-password bug is contained (admin-only route, no consumers)
  and is fixed in phase 2 with the service rebuild.
- Tests: unauthenticated → 401, authenticated non-admin → 403,
  admin creating an ADMIN user → rejected.

## Phase 2: `refactor/service-layering`

Template: `controllers/class_controller.go` + `services/class_service.go`.

- Five domains split into thin Gin controllers plus plain services:
  auth, google auth, charts, teacher, admin.
- Service shape: `func X(ctx context.Context, q generated.Querier,
  args...) (result, error)`. No `*gin.Context`, no `database.Queries`
  global reads, no other package-global dependencies (the Google
  verifier gets its client ID/secret as struct fields via a
  constructor).
- Errors: services return the sentinels in `services/errors.go`;
  controllers map them with `errors.Is` (see `respondClassError`).
- Fixes riding along:
  - `GetGeneralUserInfo` returns `ErrNotFound`; the user-info
    controller maps it (kills the dead string-compare 404 branch).
  - `POST /user` accepts a plain `password` field on a dedicated
    request DTO and hashes it with bcrypt, like `Register`.
  - Delete the unrouted duplicates `GetSchoolTeachers` /
    `GetSchoolStudents`.
- Tests convert from Gin-context tests to plain service-function
  tests with a fake `Querier`. Response contracts do not change.

## Phase 3: `refactor/stdlib-http`

Adopt the Ryer structure (Go 1.26 stdlib mux, method+path patterns):

- `run(ctx, ...)` testable main; `http.Server` with timeouts and
  graceful shutdown.
- `NewServer(deps...) http.Handler` wires mux + middleware.
- `routes.go` holds the full route table.
- Handlers become makers: `func handleX(deps...) http.Handler`;
  dependencies (logger, querier) are injected, killing the
  `database.Queries` global reads in controllers.
- Middleware becomes `func(http.Handler) http.Handler`; the auth
  middleware stores the user ID under a typed context key.
- Generic `encode`/`decode` helpers replace `c.JSON` /
  `ShouldBindJSON`.
- Validation keeps the current `Validate() error` contract. The
  article's `Valid(ctx) map[string]string` interface would change
  error-response JSON; that is a separate decision with the frontend.

## Out of scope (tracked, not lost)

- The `getEnvInt` panic on the request path (fold into phase 3 or later).
- The account-lockout log-and-continue behavior in `auth_service.go`.
- Renaming the `DTOs/` package.
- Any change to error-response JSON shapes.

## Verification

Every phase: `make check-go` green (gofmt, go vet, golangci-lint,
`go test -race`), plus the frontend e2e smoke where relevant.
