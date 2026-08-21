# Classes & Assignments — the teacher tier

Reference for the shipped teacher tier: a teacher creates a class, reads a
join code to their students, assigns a game with a frozen configuration, and
watches the results grid fill in. Students join by code, see their
assignments, and play them in "assignment mode".

This is not a plan. Everything below exists in `frontend/src/app/features/classes/`
and in `core-api/`. Read it before changing the feature, and keep it true
when you do.

Three parts:

1. **The backend contract** — the Go routes and their exact JSON. The Go code
   is the authority; every route and field here was checked against it.
2. **What shipped** — the pages, the component tree, the service, the models,
   and how `/assignments/:id/play` resolves a game at runtime.
3. **Conventions** — the rules a contributor has to follow in this feature.
   Each one is a defect that shipped once.

For visual work, `DESIGN.md` is the source of truth. For the game engine the
assignment-play route hosts, `CLAUDE.md`'s invariants and
`.migration/phase-5-handoff.md` are.

---

## Part 1 — The backend contract

All routes are on the **Go service** (`environment.coreApi`, default
`http://localhost:5001`) and all require a JWT — every group in
`core-api/controllers/class_controller.go` applies
`middleware.AuthMiddleware()`. `authInterceptor` attaches the bearer token and
`refreshInterceptor` handles the 401; nothing in this feature touches tokens.

Authorization (teacher role, class ownership, enrollment) is enforced
server-side, in the service layer rather than in route middleware. The
frontend does not re-check it; it handles the status codes.

Field names below are the **exact JSON** the API sends and expects
(snake_case).

### Classes

| Method | Path                                   | Body            | Success | Returns                              |
| ------ | -------------------------------------- | --------------- | ------- | ------------------------------------ |
| POST   | `/api/classes`                         | `{ name }`      | 201     | `ClassResponse`                      |
| GET    | `/api/classes`                         | —               | 200     | `ClassResponse[]` (teacher's own)    |
| GET    | `/api/classes/joined`                  | —               | 200     | `StudentClassResponse[]` (student's) |
| POST   | `/api/classes/join`                    | `{ join_code }` | 200     | `StudentClassResponse`               |
| GET    | `/api/classes/:id/roster`              | —               | 200     | `RosterEntryResponse[]`              |
| DELETE | `/api/classes/:id`                     | —               | 200     | `{ message: "Class archived" }`      |
| DELETE | `/api/classes/:id/students/:studentId` | —               | 200     | `{ message: "Student removed" }`     |

### Assignments

| Method | Path                                       | Body                      | Success | Returns                             |
| ------ | ------------------------------------------ | ------------------------- | ------- | ----------------------------------- |
| POST   | `/api/classes/:id/assignments`             | `CreateAssignmentRequest` | 201     | `AssignmentResponse`                |
| GET    | `/api/classes/:id/assignments`             | —                         | 200     | `AssignmentResponse[]`              |
| GET    | `/api/assignments`                         | —                         | 200     | `StudentAssignmentResponse[]`       |
| GET    | `/api/assignments/:id/results`             | —                         | 200     | `AssignmentResultRow[]`             |
| GET    | `/api/assignments/:id/attempts/:studentId` | —                         | 200     | `AssignmentAttempt[]`               |
| DELETE | `/api/assignments/:id`                     | —                         | 200     | `{ message: "Assignment deleted" }` |

`GET /api/assignments/:id/attempts/:studentId` is the drill-down behind a
results row. It is readable by the owning teacher (or an admin) **or by the
student themself**. Rows come back oldest-first.

### Endpoints that do not exist

Two gaps shape the pages, so they are contract, not trivia:

- **No `GET /api/classes/:id`.** `ClassDetailPageComponent` fetches the
  teacher's whole list and finds the row.
- **No `GET /api/assignments/:id`, and no assignment update route at all.**
  `AssignmentPlayPageComponent` finds the assignment in the student's own
  list — which doubles as the authorization check, since an assignment for a
  class the student is not in is simply not in the list. Editing an
  assignment means delete and recreate.

If either by-id endpoint ever lands, those two pages are what should stop
over-fetching.

Separately: `PATCH/POST/DELETE/GET /api/users/...` for **updateProfile,
changePassword, deleteAccount and downloadUserData do not exist** — not as
routes and not as handlers. `controllers/user_info_controller.go` mounts
exactly one route (`GET /api/users/:userId/general-info`). React's
`user.service.ts` declared all four anyway and they would have 404'd; the
Angular `UserService` dropped them, and `/account` answers with a
"coming soon" toast. Do not add callers.

### Submitting an attempt

There is **no attempts endpoint**. An attempt is the existing score entry,
tagged with `assignment_id`:

```
POST /api/note-game/entry     -> 201 { message, id }
{ user_id, time_length, total_questions, correct_questions,
  notes_per_minute, game_type, assignment_id }
```

`assignment_id` is `*int` on the Go side — optional. When present the server
checks that the student is enrolled and that `game_type` matches the
assignment's; a failure fails the whole POST, so the score is not recorded at
all.

Three traps on this endpoint that are not about assignments but will bite
anyone touching the save path:

- `correct_questions` carries `validate:"required"`, so **a score of 0 is
  rejected with 400**.
- `notes_per_minute` is an `int8`, so **any value above 127 fails JSON
  binding with 400**. `user_id` is an `int16`.
- `user_id` must equal the JWT's user or the answer is 403 `Not authorized`.

`assignment_id` is **omitted**, never sent as `null`, when the play is not an
attempt — see `toCreateGameEntryDto` in `@shared/models/game.models` and the
spec that pins it.

### Response shapes (exact JSON)

```jsonc
// ClassResponse — teacher's view (has the join code)
{ "id": 1, "name": "Symphonic Band", "join_code": "7NZJN3",
  "student_count": 12, "created_at": "2026-07-12T04:00:00Z" }

// StudentClassResponse — student's view (NO join code)
{ "id": 1, "name": "Symphonic Band", "teacher_name": "Terry Director" }

// RosterEntryResponse
{ "student_id": 42, "first_name": "Sam", "last_name": "Student",
  "joined_at": "2026-07-12T04:05:00Z" }

// AssignmentResponse
{ "id": 3, "class_id": 1, "title": "Week 1: Treble Notes",
  "game_type": "note", "config": { "clef": "treble", "scale": "C Major" },
  "due_at": "2026-07-20T00:00:00Z" | null,
  "target_questions": null, "target_accuracy": 80 | null,
  "created_at": "2026-07-12T04:10:00Z" }

// StudentAssignmentResponse — a FLAT object: AssignmentResponse's fields
// inline (Go embeds the struct), plus these four.
{ ...AssignmentResponse,
  "class_name": "Symphonic Band",
  "attempt_count": 1, "best_correct": 15, "best_accuracy": 75 }

// AssignmentResultRow — one row per enrolled student; zero-attempt students
// still appear.
{ "student_id": 42, "first_name": "Sam", "last_name": "Student",
  "attempt_count": 1, "best_correct": 15, "most_questions": 20,
  "best_accuracy": 75, "last_attempt_date": "2026-07-12" }

// AssignmentAttempt — the drill-down rows, oldest first
{ "correct_questions": 15, "total_questions": 20, "accuracy": 75,
  "notes_per_minute": 42, "attempted_date": "2026-07-12" }
```

**No field in any of these DTOs uses `omitempty`** — every field always
serializes. `due_at`, `target_questions` and `target_accuracy` are Go
pointers, so "unset" arrives as JSON `null`, never as a missing key. That is
why the TS wire types spell them `| null` rather than `?`.

`last_attempt_date` is `""`, not `null`, until the student's first attempt.
`AssignmentResultsGridComponent.notStarted()` accepts either that or
`attempt_count === 0` as "not started".

`config` is `json.RawMessage` — it comes back as a raw JSON object, not a
string. The Go service never looks inside it.

### CreateAssignmentRequest, and what the server validates

```jsonc
{ "title": "Week 1: Treble Notes",   // required after trim, max 255 bytes
  "game_type": "note",               // note | key_signature | scale | chord | interval
  "config": { ... },                 // REQUIRED: a JSON object, <= 4096 bytes
  "due_at": "2026-07-20T00:00:00Z" | null,   // optional, RFC3339
  "target_questions": 20 | null,     // optional, > 0
  "target_accuracy": 80 | null }     // optional, 1..100 inclusive
```

Two rules worth naming because they are easy to get wrong:

- **`config` is required**, must parse as JSON, must be an **object** (not
  `null`, an array or a scalar), and must be at most 4096 bytes. This is the
  same `ConfigBlobErrors` check `/api/game-settings` uses.
- **`game_type` is not normalized here.** The score-entry endpoint turns an
  empty `game_type` into `"note"`; assignment creation does not — an empty
  string is a validation error. `defaultAssignmentConfig()` and the dialog
  always send an explicit type, so this only matters if you hand-build a
  request.

Class name: required after trim, max 255 bytes.

Validation is hand-rolled `Validate()` methods in the service layer, not gin
`binding:` tags. A body that parses but fails validation is 400
`{"error":"Invalid request"}`; a body that does not parse is 400
`{"error":"Invalid request body"}`. Neither message is specific enough to put
in front of a user.

### Status codes → what they mean

- **201 / 200** — success. Note `POST /api/classes/join` answers **200**, not 201.
- **400** — validation failed, or a bad `assignment_id` tag on a score entry.
  The body is `{ "error": "Invalid request" }` for a body that parses but
  fails validation, `{ "error": "Invalid request body" }` for one that does
  not parse, and `{ "error": "Invalid id" }` for a non-numeric or
  non-positive path id.
- **403** `{ "error": "Forbidden" }` — wrong role or not the owner. Also
  returned when a **teacher tries to join their own class**.
- **404** `{ "error": "Not found" }`. On `POST /api/classes/join`
  specifically the body is `{ "error": "No class with that join code" }` —
  `JoinClassCardComponent` renders it inline next to the code field.
- **401** — the interceptor handles refresh and logout. Don't special-case it.

**One asymmetry to know:** the class and assignment endpoints distinguish
403/404/400, but the score-entry endpoint **collapses every tag-validation
failure to 400** — wrong game type, not enrolled and unknown assignment all
look the same. It also answers 400 on internal errors. Treat any non-201
there as "the attempt was not recorded" and say so generically.

### Rules the backend enforces

- Only a **TEACHER** (or ADMIN) can create a class or act on one they own.
  There is no admin UI surface, so the frontend's teacher check is
  `role === "TEACHER"` (`teacherGuard`).
- **Join codes are generated 6 characters** from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`
  (ambiguous characters excluded). Lookup uppercases the input and strips all
  spaces, so codes are case-insensitive and whitespace-tolerant. **The server
  does not check the length of the code you send** — only that it is non-empty
  after trimming. The 6-character cap on the input is the frontend's
  (`maxLength(path.joinCode, 6)` in `JoinClassCardComponent`).
- **Joining is idempotent.** The insert ends in
  `on conflict (class_id, student_id) do nothing`, so re-joining is a 200,
  not an error. "Already joined" is not a state to design around.
- **Archiving is a soft delete.** The class vanishes from both lists and
  blocks new joins; existing data survives. There is no unarchive endpoint,
  which is why `ClassHeaderComponent` puts it behind a confirm dialog.
- **`DELETE /api/classes/:id/students/:studentId` doubles as "leave class"** —
  self-removal does not require ownership.
- **Assignment `config` is a frozen snapshot.** Changing your personal game
  settings later never changes an existing assignment.
- **Targets are advisory.** The server stores `target_accuracy` and
  `target_questions` and never grades against them. "Met the target" is a
  frontend computation — `hasMetTarget()` in `assignment-card.component.ts`.

### Two quirks in the responses

- **`POST /api/classes/join` returns `teacher_name: ""`.** `JoinClass` only
  fills `id` and `name`; only `GET /api/classes/joined` populates the teacher.
  Don't render the teacher name off a join response.
- **`POST /api/classes` returns `student_count: 0`,** hardcoded. It is a fresh
  class so the value is right, but it is not read from the roster. This is
  half of why `ClassesPageComponent` reloads the list after a create instead
  of splicing the created class in.

---

## Part 2 — What shipped

Everything lives under `frontend/src/app/features/classes/`. Nothing in this
feature has its own route file; all four routes are inlined in
`src/app/app.routes.ts` like every other route in the app.

### Routes and guards

| Path                    | Guard          | Component                     |
| ----------------------- | -------------- | ----------------------------- |
| `/classes`              | `teacherGuard` | `ClassesPageComponent`        |
| `/classes/:id`          | `teacherGuard` | `ClassDetailPageComponent`    |
| `/assignments`          | `authGuard`    | `AssignmentsPageComponent`    |
| `/assignments/:id/play` | `authGuard`    | `AssignmentPlayPageComponent` |

All four are `loadComponent` and all four carry
`runGuardsAndResolvers: "always"`, which is what makes logging out on a
guarded page bounce the visitor to `/login` (see the header of
`app.routes.ts`).

`teacherGuard` (`src/app/auth/services/security/teacher.guard.ts`) checks the
role **only once the visitor is signed in**, then delegates to `authGuard`;
an anonymous visitor goes to `/login`, not to `/dashboard`.

`:id` reaches both detail pages as `input.required<string>()` via
`withComponentInputBinding()`. Both wrap it in `Number()` and treat `NaN` as
not-found.

Entry points: `NavigationComponent.roleLinks` shows **Classes** for
`TEACHER` and **Assignments** for `STUDENT`; `TeacherDashboardComponent` on
`/dashboard` links to `/classes`.

### The component tree

`components/` holds one folder per component. Pages first, then what they
compose:

```
/classes                ClassesPageComponent
                        └── ClassCardComponent          (one per class, copy join code)
                        └── CreateClassDialogComponent

/classes/:id            ClassDetailPageComponent
                        ├── ClassHeaderComponent        (name, code + copy, archive)
                        ├── RosterListComponent         (enrolled students, remove)
                        ├── ClassAssignmentsListComponent
                        │   └── CreateAssignmentDialogComponent
                        └── AssignmentResultsGridComponent   (only when a row is selected)
                            ├── ClassInsightTilesComponent   (client-side rollup)
                            └── AttemptDrilldownComponent    (only when a row is expanded)

/assignments            AssignmentsPageComponent
                        ├── JoinClassCardComponent      (join by code + classes joined)
                        └── StudentAssignmentsListComponent
                            └── AssignmentCardComponent (progress, target badge, Practice)

/assignments/:id/play   AssignmentPlayPageComponent
                        └── AssignmentGameHostComponent (the five-branch @switch)
```

Notes on the ones that are not obvious:

- **`ClassDetailPageComponent` owns the selection.** Which assignment's
  results are showing is a `signal<Assignment | null>` on the page;
  `ClassAssignmentsListComponent` takes `selectedId` in and emits
  `assignmentSelected` / `selectionCleared` out. Deleting the selected
  assignment clears the selection, so the grid never fetches results for an
  id that is gone.
- **Removing a student refetches two things.** `student_count` lives on the
  class, not on the roster, so `RosterListComponent` reloads its own resource
  _and_ emits `rosterChanged` for the page to reload the class list.
- **Per-row confirm state is one signal and one dialog.** React gave each
  roster and assignment row its own component purely to hold a `useState`.
  Signals don't need that, so both lists keep a single `confirming` signal
  naming the row and render one `<app-confirm-dialog>`.
- **`AttemptDrilldownComponent` is created, not enabled.** React's
  `useAssignmentAttempts(..., enabled)` gated the fetch on a flag; here the
  component only exists inside the expanded row's `@if`, so the resource
  starts on creation and cancels on collapse. Same request pattern, expressed
  by lifetime.
- **A zero-attempt row is a `div`, not a `button`.** There is nothing to
  expand, so it must not be keyboard-reachable as though there were.
- **`ClipboardService` is provided on `ClassCardComponent` and
  `ClassHeaderComponent`,** not at the root — `copied` is per-card state and a
  shared instance would tick every card at once.
- **`ClassInsightTilesComponent` makes no request.** `computeClassInsightStats()`
  is a pure rollup over the already-fetched `AssignmentResult[]` and is
  exported separately from the component because the arithmetic is what the
  spec pins.

### `ClassesService`

`services/classes.service.ts`, root-provided, one method per endpoint,
Observables in and out. It is the only file in the feature that knows a URL
or a wire shape.

```ts
createClass(name)                          -> Observable<Class>
getTeacherClasses()                        -> Observable<Class[]>
getStudentClasses()                        -> Observable<StudentClass[]>
joinClass(joinCode)                        -> Observable<StudentClass>
getClassRoster(classId)                    -> Observable<RosterEntry[]>
archiveClass(classId)                      -> Observable<MessageResponse>
removeStudent(classId, studentId)          -> Observable<MessageResponse>
createAssignment(classId, request)         -> Observable<Assignment>
getClassAssignments(classId)               -> Observable<Assignment[]>
getStudentAssignments()                    -> Observable<StudentAssignment[]>
getAssignmentResults(assignmentId)         -> Observable<AssignmentResult[]>
deleteAssignment(assignmentId)             -> Observable<MessageResponse>
getAssignmentAttempts(assignmentId, studentId) -> Observable<Attempt[]>
```

**There is no caching layer here and there must not be one.** Pages hold
`rxResource`s and call `.reload()` when a mutation lands. Two components
reading the same endpoint firing two requests is the policy, not a bug — it
is what replaced TanStack's `invalidateQueries`, and it is why joining a
class refreshes the assignment list here where in React it did not.

### Models and mappers

- `models/classes.models.ts` — both halves in one file: the snake_case wire
  interfaces (`ClassResponse`, `AssignmentResponse`, `AssignmentResultRow`,
  `AttemptResponse`, the three request shapes, `MessageResponse`) and the
  camelCase domain interfaces (`Class`, `StudentClass`, `RosterEntry`,
  `Assignment`, `StudentAssignment`, `AssignmentResult`, `Attempt`).
- `models/classes.mappers.ts` — seven plain functions, wire → domain and
  nothing else. Plain functions rather than private service methods so they
  can be unit-tested without standing the service up.
- `models/assignment-launch.ts` — `AssignmentLaunch = { id, config }`, what an
  assignment hands a game.
- `models/game-definitions.ts` — labels, options, the generic-game predicates,
  `isKnownGameType()` and `defaultAssignmentConfig()`. See below.

`config` is **deliberately passed through untouched** by the mappers. It is an
opaque JSONB blob whose keys belong to the game that wrote it; converting it
would corrupt it.

### Playing an assignment

`/assignments/:id/play` is two components with a hard seam between them.

**`AssignmentPlayPageComponent`** does everything up to the handoff and
branches on nothing:

1. `assignmentId = computed(() => Number(this.id()))`.
2. An `rxResource` over `getStudentAssignments()` — there is no by-id
   endpoint, and the list _is_ the authorization check.
3. `assignment` finds the row, guarding `.value()` behind `.error()`.
4. `playable` returns `{ gameType, launch }` or `undefined`:

```ts
readonly playable = computed<
	{ gameType: GameType; launch: AssignmentLaunch } | undefined
>(() => {
	const assignment = this.assignment();
	if (!assignment) return undefined;
	if (!isKnownGameType(assignment.gameType)) return undefined;
	return {
		gameType: assignment.gameType,
		launch: { id: assignment.id, config: assignment.config },
	};
});
```

**`isKnownGameType()` is load-bearing.** `GameType` is a compile-time claim
about a runtime value — the Go service fills `game_type`, so an assignment
created against a newer backend can carry a type this build has never heard
of. React got the guard for free by looking the type up in a definition
registry and falling through on a miss; the Angular host is a `@switch`, which
has no miss, so the predicate restores it. An unknown type renders the
not-found panel, not a blank game. It was silently dropped once during the
migration and caught in review.

**`AssignmentGameHostComponent`** is the whole branch and nothing else: a
five-case `@switch` on `gameType()` that binds `NoteGamePageComponent` for
`"note"` and `IdentificationGameComponent` with the matching definition
constant (`keySignatureGame`, `scaleGame`, `chordGame`, `intervalGame`) for
the other four, passing `launch()` straight through as the `assignment`
input.

The `@switch` is **four explicit bindings rather than a lookup in
`GAME_DEFINITIONS`**, deliberately: the shell is generic, and a concrete
binding is what lets the compiler check each definition against it. A table
lookup would need its types erased and would check nothing. The `@default`
arm survives for an unknown type that somehow got past the guard.

**What the `assignment` input does inside a game** — the same three things in
both `IdentificationGameComponent` and `NoteGamePageComponent`:

1. **Settings come from the frozen config**, not the student's saved row. The
   identification shell runs it through `sanitizeConfig`, so a stale or
   hand-edited blob degrades to defaults instead of breaking the fetcher; the
   note game runs it through `mapNoteAssignmentConfig`, which guards
   per-field for the same reason. Hydration happens exactly once.
2. **The settings save-back is suppressed.** Playing an assignment must never
   overwrite what the student chose for themselves — both `onGameStart`
   handlers return early when `assignment()` is set. The saved-settings
   request is skipped entirely too.
3. **The attempt is tagged.** `GameScoreSaverService.save()` takes the
   assignment id as its third argument and puts `assignment_id` on the score
   entry. That is the whole attempt mechanism.

Nothing in the classes feature does any of that — it is inside the game
components, which is why the play page is thin.

### `defaultAssignmentConfig()` and `GAME_DEFINITIONS`

A new assignment freezes a config. `CreateAssignmentDialogComponent` holds
`gameType` and `config` as plain signals (not form fields — the config is an
opaque blob zod has no opinion about), and switching games snapshots the new
game's defaults:

<!-- prettier-ignore -->
```ts
export function defaultAssignmentConfig(
	gameType: GameType,
): Record<string, unknown> {
	if (gameType === "note") return toNoteAssignmentConfig(NOTE_GAME_DEFAULTS);
	return structuredClone({ ...GAME_DEFINITIONS[gameType].defaults });
}
```

**Nothing here is a copy.** The four identification games' defaults are read
off their own `GameDefinition`; the note game's off `NOTE_GAME_DEFAULTS`, the
same constant its page starts from. An earlier version kept a hand-copied
table, which is exactly the thing that drifts — "settings live in the
definition" is the feature's premise. A fresh object every call, so the
dialog can patch it without writing through to the definition.

`GAME_DEFINITIONS` (in `@features/identification-game/data`) is a
`Record<SettingsGameType, AnyGameDefinition>` — the four identification games,
type parameters erased. It exists for **lookup only**, and
`defaultAssignmentConfig()` is its one consumer. The assignment host does not
read it, for the reason above.

**The config blobs are not uniform, on purpose.** The four identification
games' configs are camelCase (they are the game's settings object). The note
game's is **snake_case** — `game_mode`, `time_limit`, `low_note`, `clef` —
because it is shaped like the `note_game_settings` row and is posted straight
at the music service. `toNoteAssignmentConfig` writes it and
`mapNoteAssignmentConfig` reads it back; those two functions in
`@features/note-game/models/note-game.models` are the only places the
conversion happens. `game-definitions.spec.ts` pins the asymmetry.

#### Import from `/data`, not from the barrel

```ts
import { GAME_DEFINITIONS } from "@features/identification-game/data";
```

**Not** from `@features/identification-game`. The barrel re-exports
`GameStaffComponent`, which reaches `opensheetmusicdisplay` — a ~1 MB
engraver — so anything touching the barrel loads it, however little of it it
wants. `data.ts` exports the same feature's constants, enums, model types and
game definitions and reaches no engraver and no Angular component.

The rule (`CLAUDE.md`, "Barrel vs data entry point") is: **take data from
`/data`; take components and services from the barrel.** Four class specs read
`game-definitions.ts` and have no business loading an engraver into jsdom.
`AssignmentGameHostComponent` is the counter-example that proves the split —
it imports `IdentificationGameComponent` _and_ the four definition constants
from the barrel, because it genuinely renders the game.

It is enforced by reading, not by a lint rule. The standing check is that no
`*.ts` under `features/classes/` or `features/note-game/` imports a **value**
from the barrel that `data.ts` also exports.

---

## Part 3 — Conventions in this feature

`CLAUDE.md` carries the app-wide list. These four are the ones this feature
gets wrong if you are not watching, and each was a shipped defect.

### `status() === "loading"`, not `isLoading()`

Angular's `resource.isLoading()` is **also true while reloading**, unlike
TanStack Query's `isLoading` (`isPending && isFetching`), which is first-load
only. A template that branches on it destroys its children mid-refetch — and
therefore cancels their in-flight requests.

This shipped. `ClassDetailPageComponent`'s body was gated on `isLoading()`,
so `onRosterChanged()` tore the whole page down, which destroyed
`<app-roster-list>` mid-flight and cancelled the very roster refetch that had
triggered it.

**Every resource in this feature that anything calls `.reload()` on uses
`status() === "loading"`.** In practice:

| Resource                                      | Reloaded? | Gate                     |
| --------------------------------------------- | --------- | ------------------------ |
| `ClassesPageComponent.classes`                | yes       | `status() === "loading"` |
| `ClassDetailPageComponent.classes`            | yes       | `status() === "loading"` |
| `RosterListComponent.roster`                  | yes       | `status() === "loading"` |
| `ClassAssignmentsListComponent.assignments`   | yes       | `status() === "loading"` |
| `JoinClassCardComponent.classes`              | yes       | `status() === "loading"` |
| `AssignmentResultsGridComponent.results`      | no        | `isLoading()`            |
| `StudentAssignmentsListComponent.assignments` | no        | `isLoading()`            |
| `AttemptDrilldownComponent.attempts`          | no        | `isLoading()`            |
| `AssignmentPlayPageComponent.assignments`     | no        | `isLoading()`            |

`isLoading()` is safe only on a resource nothing reloads. If you add a
`.reload()` to one of the bottom four, change its gate in the same commit.

### Guard every `resource.value()` behind an `error()` arm

Reading `.value()` on a resource whose fetch failed **rethrows**, which takes
the whole page down instead of showing a panel. The template shape is:

<!-- prettier-ignore -->
```html
@if (thing.status() === "loading") {
	<app-spinner />
} @else if (thing.error()) {
	<app-error [error]="thing.error()" />
} @else if (thing.value(); as value) {
	…
}
```

A `computed()` that reads `.value()` needs the same guard — the throw does not
care where it happens. Both detail pages do it explicitly:

```ts
const classes = this.classes.error() ? [] : this.classes.value();
```

Without that line the error arm never renders, because the computed throws
before the template reaches it.

### snake_case stops at the mapper — with two deliberate exceptions

Nothing above `classes.mappers.ts` sees a wire shape, and nothing below it
sees a domain shape. Add a field to `AssignmentResponse` and you add it to
`Assignment` and to `mapAssignmentResponse` in the same edit.

The exceptions are data, not property names, and rewriting them would break
saved rows:

- **`GameType`'s values.** `"key_signature"` is an identifier the Go service
  validates against `dtos.ValidGameTypes` and that rides in a query string.
- **The contents of `GameSettings.config` — and of an assignment's `config`.**
  It is an opaque JSONB blob the games own and the Go service stores
  verbatim. The four identification games keep it camelCase, the note game
  keeps it snake_case, and the mapper passes it through untouched. This is
  why the assignment `config` is typed `Record<string, unknown>` on both sides
  of the mapper — there is nothing to convert.

### Everything else

- **Reads are `rxResource`; mutations are a one-shot `.subscribe()`.** No
  `takeUntil`, no stored `Subscription`, no `ngOnDestroy` — `HttpClient`
  observables complete after one emission and `rxResource` owns its own
  teardown.
- **Mutation errors toast through `NotificationService.showError()`,** with a
  message built from `getErrorMessage(err)`. The one exception is the join
  form, where a wrong code is a 404 whose body the student needs to read next
  to the field they just typed in — `JoinClassCardComponent` writes it to a
  `serverError` signal and the field renders it inline. React said the same
  thing with `meta: { suppressErrorToast: true }`.
- **Every stacked component sets `:host { display: block }`.** Angular's
  default is `display: inline`, where vertical margins do not apply, which
  silently ate the `space-y-6` between every card on `/classes/:id` and
  `/assignments`. The two dialogs use `display: contents`, which takes no
  margin either — use `flex flex-col gap-*` around kit components there.
- **Design.** `DESIGN.md` is the source of truth. In this feature brass is
  spent on exactly one thing per screen: the **best accuracy** figure and its
  meter in the results grid. The insight tiles and the drill-down are
  deliberately ink/muted so they do not compete with it. Selected state is an
  ink fill (`bg-primary`), never brass; hover is `hover:bg-accent/50`.
  `tabular-nums` on every number.

---

## Tests

81 unit tests across 10 spec files under `features/classes/`:

| Spec                                         | Covers                                                          |
| -------------------------------------------- | --------------------------------------------------------------- |
| `services/classes.service.spec.ts`           | every method's URL, verb, body and mapping                      |
| `models/game-definitions.spec.ts`            | the five default configs, incl. the note game's snake_case blob |
| `assignment-card.component.spec.ts`          | progress wording, target badge, `hasMetTarget`                  |
| `assignment-play-page.component.spec.ts`     | resolve, not-found, unknown game type, no stray requests        |
| `assignment-results-grid.component.spec.ts`  | not-started rows, drill-down created only when expanded         |
| `class-detail-page.component.spec.ts`        | selection, roster-changed reload, `NaN` id                      |
| `classes-page.component.spec.ts`             | the four states, create → reload                                |
| `class-insight-tiles.component.spec.ts`      | `computeClassInsightStats` arithmetic                           |
| `create-assignment-dialog.component.spec.ts` | validation, game-type switch resets the config                  |
| `join-class-card.component.spec.ts`          | inline error on a bad code, reload on success                   |

`e2e/specs/classes.spec.ts` is the Playwright parity suite for the feature,
captured against the React app and green against Angular. Several strings in
this feature are contracts it selects on: the headings "My Classes" and
"Assignments" (`exact: true`), the labels "Class name" and "Class code", the
buttons "New class", "Create class", "Join", "Practice" and "Copy join code",
and the progress wording "No attempts yet" / "1 attempt". Changing any of
them is a parity-suite change.

```bash
export NVM_DIR="$HOME/.config/nvm" && . "$NVM_DIR/nvm.sh" && nvm use 24
npm run test:run
npm run lint
npm run build
```

## Known gaps

- **No accuracy chart in the drill-down.** React drew a line chart of accuracy
  over time above the attempt rows when there was more than one attempt. The
  chart library is still an open decision, so `shared/components/charts/` does
  not exist and the rows are the whole panel.
- **The create-assignment dialog freezes defaults, it does not let you tune
  them.** React's dialog embedded each game's own settings UI
  (`SettingsControls`, the range picker) so a teacher could adjust the config
  before creating. The Angular dialog picks a game and freezes that game's
  defaults — which is what React froze when a teacher touched nothing. The
  pieces to close this exist and are exported for it:
  `<app-settings-controls>` off the identification-game barrel renders any
  game's `settingsSchema`.
- No editing an assignment (there is no update endpoint), no unarchive, no
  gradebook or export, no parent views, no leaderboards.
