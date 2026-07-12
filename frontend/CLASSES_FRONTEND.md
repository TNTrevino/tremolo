# Classes & Assignments — Frontend Implementation Handoff

This document is the spec for building the **frontend** of the teacher tier
(classes + assignments). The backend is done, merged-pending in PR #189
(`feature/classes-and-assignments`), and fully tested. Your job is the UI that
talks to it.

Read this top to bottom before writing code. It has three parts:

1. **What exists** — the backend API contract you're building against.
2. **How this frontend works** — the conventions you must follow (with file
   paths), so your code fits the codebase instead of fighting it.
3. **What to build** — pages, the API layer, the game "assignment mode"
   integration, plus design guardrails, gotchas, and a suggested build order.

The guiding product context is in `ROADMAP.md` (repo root): teachers/programs
are who pay; this is roadmap item 1, "the reason a director pays." Keep it
MVP — ship the loop (create class → students join → assign → see results),
not a gradebook.

---

## Part 1 — The backend API contract

All routes are on the **Go service** (`VITE_BACKEND_MAIN`, default
`http://localhost:5001`) and require a JWT (the existing `mainApiClient`
attaches it — see Part 2). Authorization (teacher role, class ownership,
enrollment) is enforced server-side; you don't re-check it, you just handle
the status codes.

Field names below are the **exact JSON** the API sends/expects (snake_case).

### Classes

| Method | Path                                   | Body            | Success | Returns                              |
| ------ | -------------------------------------- | --------------- | ------- | ------------------------------------ |
| POST   | `/api/classes`                         | `{ name }`      | 201     | `ClassResponse`                      |
| GET    | `/api/classes`                         | —               | 200     | `ClassResponse[]` (teacher's own)    |
| GET    | `/api/classes/joined`                  | —               | 200     | `StudentClassResponse[]` (student's) |
| POST   | `/api/classes/join`                    | `{ join_code }` | 200     | `StudentClassResponse`               |
| GET    | `/api/classes/:id/roster`              | —               | 200     | `RosterEntryResponse[]`              |
| DELETE | `/api/classes/:id`                     | —               | 200     | `{ message }` (archive)              |
| DELETE | `/api/classes/:id/students/:studentId` | —               | 200     | `{ message }` (remove / self-leave)  |

### Assignments

| Method | Path                           | Body                      | Success | Returns                                                  |
| ------ | ------------------------------ | ------------------------- | ------- | -------------------------------------------------------- |
| POST   | `/api/classes/:id/assignments` | `CreateAssignmentRequest` | 201     | `AssignmentResponse`                                     |
| GET    | `/api/classes/:id/assignments` | —                         | 200     | `AssignmentResponse[]`                                   |
| GET    | `/api/assignments`             | —                         | 200     | `StudentAssignmentResponse[]` (student's, with progress) |
| GET    | `/api/assignments/:id/results` | —                         | 200     | `AssignmentResultRow[]` (teacher grid)                   |
| DELETE | `/api/assignments/:id`         | —                         | 200     | `{ message }`                                            |

### Submitting an attempt

There is **no new endpoint** for attempts. An attempt is the existing score
entry, tagged with `assignment_id`:

```
POST /api/note-game/entry
{ user_id, time_length, total_questions, correct_questions,
  notes_per_minute, game_type, assignment_id }   // assignment_id is NEW & optional
```

Success is **201**. This is the single most important integration point — see
Part 3.4.

### Response shapes (exact JSON)

```jsonc
// ClassResponse — teacher's view (has the join code)
{ "id": 1, "name": "Symphonic Band", "join_code": "7NZJN3",
  "student_count": 12, "created_at": "2026-07-12T04:00:00Z" }

// StudentClassResponse — student's view (NO join code; students shouldn't reshare it)
{ "id": 1, "name": "Symphonic Band", "teacher_name": "Terry Director" }

// RosterEntryResponse
{ "student_id": 42, "first_name": "Sam", "last_name": "Student",
  "joined_at": "2026-07-12T04:05:00Z" }

// AssignmentResponse
{ "id": 3, "class_id": 1, "title": "Week 1: Treble Notes",
  "game_type": "note", "config": { "scale": "C", "clef": "treble" },
  "due_at": "2026-07-20T00:00:00Z" | null,
  "target_questions": null, "target_accuracy": 80 | null,
  "created_at": "2026-07-12T04:10:00Z" }

// StudentAssignmentResponse — AssignmentResponse + these:
{ ...AssignmentResponse,
  "class_name": "Symphonic Band",
  "attempt_count": 1, "best_correct": 15, "best_accuracy": 75 }

// AssignmentResultRow — one row per enrolled student; zero-attempt students still appear
{ "student_id": 42, "first_name": "Sam", "last_name": "Student",
  "attempt_count": 1, "best_correct": 15, "most_questions": 20,
  "best_accuracy": 75, "last_attempt_date": "2026-07-12" }  // "" until first attempt
```

### CreateAssignmentRequest

```jsonc
{ "title": "Week 1: Treble Notes",
  "game_type": "note",                       // one of: note, key_signature, scale, chord, interval
  "config": { ... },                          // the game's settings blob (see Part 3.3)
  "due_at": "2026-07-20T00:00:00Z" | null,    // optional (RFC3339)
  "target_questions": 20 | null,              // optional, > 0
  "target_accuracy": 80 | null }              // optional, 1..100
```

### Status codes → what they mean → UX

- **201 / 200** — success.
- **400** — validation failed (bad name, bad config, bad target), **or** an
  invalid assignment tag on an entry. The body is `{ "error": "..." }`.
  On the class endpoints the message is generic (`"Invalid request"`); show
  a toast.
- **403** — you lack the role/ownership (student creating a class; a teacher
  reading a class they don't own; a student hitting a teacher-only route).
- **404** — not found. On `POST /api/classes/join` specifically this is
  `{ "error": "No class with that join code" }` — surface it inline near the
  code input, not just a toast.
- **401** — token expired/invalid; `mainApiClient` already handles refresh and
  logout. Don't special-case it.

**One asymmetry to know:** the class/assignment endpoints distinguish
403/404/400, but the **entry endpoint collapses all tag-validation failures to
400** (wrong game type, not enrolled, unknown assignment all return 400). So
when tagging an attempt fails, treat any non-201 as "couldn't record this as an
assignment attempt" and show a generic error.

### Rules the backend enforces (so you don't have to, but should reflect in UI)

- Only a **TEACHER** (or ADMIN) can create a class or act on one they own.
- Join codes are **6 chars**, case-insensitive, whitespace-tolerant, and
  **idempotent** (re-joining is a no-op success, not an error).
- Archiving a class hides it from both teacher and student lists and blocks
  new joins; existing data survives.
- Assignment `config` is a **frozen snapshot** — editing your personal game
  settings later never changes an existing assignment.
- Tagging an attempt requires the student to be enrolled and the entry's
  `game_type` to match the assignment's.

---

## Part 2 — How this frontend works (conventions to follow)

Match these exactly. Paths are under `frontend/src`.

### Stack & house rules

- React + TypeScript + Vite, Tailwind, Zustand, TanStack Query, react-router.
- **Hard tabs** for indentation (Prettier-enforced). Path alias **`@/` → `src/`**.
- ESLint runs with `--max-warnings 0` and the build runs `tsc` — zero warnings,
  no type errors, or CI fails. Run `npm run lint` and `npm run build` before
  you're done.

### API layer (`services/api/`)

- **Client:** import `mainApiClient` from `@/services/api/clients`. It attaches
  the JWT and handles 401-refresh/logout automatically. Do **not** build your
  own axios instance or touch tokens.
- **Service class:** one class per domain, constructor takes the client,
  methods call `this.client.get/post/delete<ResponseDto>(url, body)` and
  `return response.data`. Model it on `services/api/friends.service.ts`.
  Register a singleton in `services/api/index.ts`
  (`export const classesService = new ClassesService(mainApiClient);`).
- **Types:** wire types are snake_case `*Request`/`*Response` in
  `services/api/types/<domain>.types.ts`, re-exported from `types/index.ts`.
  Map to camelCase domain types either inline in the service (small) or in
  `services/api/mappers/` (reusable). See `types/friend.types.ts` +
  `friends.service.ts` for the pattern.
- **Query hooks:** live in `shared/hooks/queries/use<Domain>Query.ts`. Export a
  `<domain>Keys` factory (`{ all: ["classes"] as const, list: () => [...] }`),
  `useQuery` for reads, `useMutation` for writes. Gate reads with
  `enabled: isAuthenticated`. On mutation success, `invalidateQueries` the
  relevant keys. Model on `shared/hooks/queries/useFriendsQuery.ts`.
- **Errors/toasts are global.** The `QueryClient` in `App.tsx` toasts on any
  query/mutation error using `meta`. You do **not** write try/catch+toast in
  hooks — you set `meta: { errorTitle: "Failed to create class" }`, or
  `meta: { suppressErrorToast: true }` when a component shows the error inline
  (do this for join-by-code, so a 404 renders next to the input).

### Auth & roles (`stores/auth.store.ts`)

- Role is first-class: `useAuthStore((s) => s.user)?.role` is one of
  `"STUDENT" | "TEACHER" | "PARENT" | "BASIC"`. `isAuthenticated` answers
  "logged in?". The existing teacher check is `authUser?.role === "TEACHER"`
  (see `DashboardPage.tsx`).
- **No role guard exists yet** — routing has `ProtectedRoute` (auth) and
  `GuestRoute` (guest) in `shared/components/layout/`. You'll add a
  `TeacherRoute` modeled on `ProtectedRoute` (Part 3.2).

### Routing, nav, pages

- Routes are declared in `App.tsx` (`<Routes>`, mostly `lazy()`-imported,
  wrapped in `ProtectedRoute`). Add routes there.
- Nav is `shared/components/layout/Navigation.tsx` — arrays of `{ to, label }`
  mapped to `<NavItem>`, gated by `isAuthenticated`. There's a "games" dropdown
  as a model for grouping. Nav is not role-gated today; you'll add role-aware
  items.
- Pages live flat in `pages/`, one named export each
  (`export function ClassesPage()`). Feature logic/components/hooks go under
  `features/<feature>/{components,hooks,types}` (see `features/README.md`);
  pull data with your query hooks and delegate rendering to feature components.
- **Prior art to reuse:** there's already a `TeacherDashboard` card embedded in
  `/dashboard` (`features/dashboard/components/TeacherDashboard.tsx`, rendered
  when `role === "TEACHER"`) that currently says "coming soon." Your classes
  entry point can live alongside or link from there.

### Design system ("Ink, Paper & Brass" — `frontend/DESIGN.md` is source of truth)

- **Ink** = `bg-primary`/`text-primary-foreground` (deep navy): text, primary
  buttons, **selected** state. **Paper** = `bg-background`/`bg-card`. **Brass**
  = `bg-brass`/`text-brass-foreground`: the scarce accent — the single primary
  CTA and the one highlighted stat, **max ~twice per screen**.
- **`accent` is a neutral hover wash** (`hover:bg-accent/50`), never emphasis.
  **Never** use brass as a hover wash. **Never** use brass for the selected
  state (selected = ink fill). `correct`/`destructive` are feedback-only.
- Typography: `font-display` (Bricolage Grotesque) for headings/big stats,
  `font-sans` (Inter) for body; `tabular-nums` on any number that updates
  (scores, counts, accuracy).
- **Reuse the primitives** in `shared/components/` — don't reinvent:
  `ui/button` (`variant`: `default`=ink, `brass`, `outline`, `ghost`,
  `destructive`; `loading` prop), `ui/card` (`Card`/`CardHeader`/`CardTitle`/
  `CardContent`), `ui/dialog` (portal modal: `Dialog`/`DialogContent`/
  `DialogHeader`/`DialogTitle`/`DialogFooter`), `ui/input`, `ui/select`,
  `ui/skeleton`, and `forms/` (`FormField` + `FormInput`/`FormSelect` for any
  create form). `cn` from `@/lib/utils` for conditional classes.
- **List + empty-state model to copy:** `features/friends/components/
MyFriendsView.tsx` + `FriendCard.tsx`. They show the full loading/error/
  empty/populated pattern and a row card (`flex items-center gap-3 p-3
rounded-lg hover:bg-accent/50` with an `action` slot on the right). Mirror
  this for the roster, assignments list, and results grid. There is no
  `<table>` component — build grids/lists from `Card`s and stacked rows.

---

## Part 3 — What to build

Build in this order; each milestone is independently shippable and testable.

### 3.0 — API layer (do this first; everything depends on it)

Create:

- `services/api/types/class.types.ts` — the `*Request`/`*Response` interfaces
  from Part 1 (snake_case, exact field names). Add a `GameType` reuse from
  `types/game.types.ts` for `game_type`.
- `services/api/classes.service.ts` — `class ClassesService` with a method per
  endpoint in Part 1. Optionally map to camelCase domain types (`Class`,
  `StudentClass`, `RosterEntry`, `Assignment`, `StudentAssignment`,
  `AssignmentResult`) — recommended, matches `FriendsService`.
- Register in `services/api/index.ts`.
- `shared/hooks/queries/useClassesQuery.ts` — `classesKeys` factory + hooks:
  `useTeacherClasses`, `useStudentClasses`, `useClassRoster(classId)`,
  `useClassAssignments(classId)`, `useStudentAssignments`,
  `useAssignmentResults(assignmentId)`, and mutations `useCreateClass`,
  `useJoinClass`, `useArchiveClass`, `useRemoveStudent`, `useCreateAssignment`,
  `useDeleteAssignment`. Invalidate the matching list key on each mutation
  success.

### 3.1 — Teacher: My Classes

- **`/classes`** (teacher route) — `ClassesPage`. Grid of `Card`s (one per
  class) showing name, `student_count`, and the `join_code` (prominent — this
  is what they read to students; consider a copy button). A brass "New class"
  CTA opening a `Dialog` with a `FormField`/`FormInput` for the name →
  `useCreateClass`. Empty state: "No classes yet — create one to get started."
- Each class card links to **`/classes/:id`**.

### 3.2 — Teacher route guard + nav

- Add `TeacherRoute` in `shared/components/layout/` modeled on `ProtectedRoute`:
  if not authenticated → `/login`; if authenticated but `role !== "TEACHER"` →
  redirect to `/dashboard` (or a friendly "teachers only" page). Wrap all
  teacher routes with it.
- Add nav entries: a "Classes" link for teachers, and an "Assignments" link for
  students, gated on `role` in `Navigation.tsx`. Follow the existing
  `isAuthenticated` gating pattern, extended with a role check.

### 3.3 — Teacher: Class Detail (roster + assignments + create + results)

**`/classes/:id`** — `ClassDetailPage`. Sections (stacked `Card`s):

1. **Header** — class name, join code (with copy), student count; an "Archive
   class" action (`destructive`/`outline` button → confirm → `useArchiveClass`
   → navigate back to `/classes`).
2. **Roster** — `useClassRoster(id)`; render with the FriendCard-style list
   (name, joined date). Each row's `action` slot: a remove button
   (`useRemoveStudent`, calls `DELETE /api/classes/:id/students/:studentId`).
   Handle loading/empty/error states like `MyFriendsView`.
3. **Assignments** — `useClassAssignments(id)`; list each with title, game
   type, due date, targets, and a delete action (`useDeleteAssignment`). A
   brass "New assignment" CTA (see below). Each assignment links to its
   results (section 4).
4. **Results grid** — for a selected assignment, `useAssignmentResults(id)`.
   One row per student (zero-attempt students included — show them muted /
   "Not started"). Columns: student name, attempts, best correct / most
   questions, **best accuracy** (this is the one stat to emphasize with brass —
   e.g. color the accuracy or a small bar), last attempt date. Use
   `tabular-nums`. Build as a responsive grid of rows, not a `<table>`.

**Create-assignment flow (the interesting one).** An assignment needs a
`game_type` + a `config` blob that a game can actually launch from. The clean
approach: let the teacher **pick a game and configure it with the same settings
UI the game already uses**, then snapshot those settings as `config`:

- Game type picker (`note`, `key_signature`, `scale`, `chord`, `interval`).
- For the chosen type, render its settings. The generic games expose a
  declarative `settingsSchema` rendered by `SettingsControls` (see
  `features/identification-game/settings/`), and each game's `defaults` object
  IS the config shape. The note game has its own settings shape (see 3.3-config
  below). Reusing this UI guarantees the produced `config` is launchable.
- Plus: title (required), optional due date, optional target accuracy /
  target questions.
- Submit → `useCreateAssignment(classId, CreateAssignmentRequest)`.

**Config shapes (`config` blob per `game_type`)** — these are the exact objects
the games read, so an assignment stores one of them verbatim:

- **generic games** (`key_signature`/`scale`/`chord`/`interval`): the game's
  settings object, e.g. scale →
  `{ gameMode: "time", timeLimit: 60, noteLimit: 25, clefs: ["treble"],
   scaleTypes: ["major","natural_minor",...], questionMode: "accidentals" }`.
  Each game's `defaults` (in `features/identification-game/games/*.ts`) is the
  template.
- **note** game: `{ low_note, high_note, clef, game_mode, time_limit,
   note_limit, scale, octave }` (the `NoteGameSettingsRequest` shape in
  `services/api/types/game.types.ts`).

MVP shortcut if the settings-reuse is too much for a first pass: snapshot the
teacher's own **saved** settings for the chosen game (`GET /api/game-settings`
or note settings) as the config, and let them refine later. But reusing the
settings UI is the right end state.

### 3.4 — Student: Join + My Assignments + play

- **Join a class** — a small form (on the student dashboard or a
  `/classes/join` page): `FormInput` for the code + `useJoinClass`. Use
  `meta: { suppressErrorToast: true }` and render the 404 message
  (`"No class with that join code"`) inline. On success, refresh
  `/api/classes/joined`.
- **`/assignments`** (student route) — `useStudentAssignments`. List each
  assignment as a card: title, class name, due date, and **progress** from the
  response (`attempt_count`, `best_accuracy`, `best_correct`). Show a target
  badge if `target_accuracy` is set and whether they've met it
  (`best_accuracy >= target_accuracy`). Sort by due date (nulls last — the
  backend already does this). A brass "Practice" / "Start" CTA per assignment.

- **Playing an assignment (the key integration).** The CTA launches the
  assignment's game **in assignment mode**: the game is configured from the
  assignment's `config` (not the student's personal settings), and on
  completion the score entry is tagged with `assignment_id`. Wire it like this:
  1. **Thread `assignment_id` through the save path.** In
     `services/api/types/game.types.ts` add optional `assignment_id?: number`
     to `CreateNoteGameEntryRequest`, and `assignmentId?: number` to
     `SaveGameResultParams`. In `services/api/user.service.ts` `saveGameResult`,
     add `assignment_id: params.assignmentId` to the request body (it's the
     one-line change at the request object). In
     `features/identification-game/hooks/useSaveGameOnEnd.ts`, accept an
     optional `assignmentId` and pass it into the `mutate({...})` call.
  2. **Launch the game from the assignment config.** The generic shell
     `features/identification-game/components/IdentificationGamePage.tsx`
     currently takes only `{ definition }`. Add an optional
     `assignment?: { id: number; config: Record<string, unknown> }` prop. When
     present: hydrate settings from `assignment.config` via `sanitizeConfig`
     (already used there for saved settings), **suppress the `onGameStart`
     save-back** so playing an assignment doesn't overwrite the student's
     personal saved settings, and pass `assignment.id` into
     `useSaveGameOnEnd(gameType, assignmentId)`. Do the parallel wiring in
     `pages/NoteGamePage.tsx` for note-game assignments.
  3. **A launch route.** Add `/assignments/:id/play` → a page that loads the
     assignment (from the student list or a direct fetch), picks the right game
     by `game_type`, and renders the shell in assignment mode. You'll need a
     `game_type → GameDefinition` lookup for the generic games (build a small
     map from the exports in `features/identification-game/games/index.ts`);
     route `game_type === "note"` to the note-game path.
  4. On completion the existing flow POSTs the entry with `assignment_id`;
     the student's `/api/assignments` progress updates on the next fetch
     (invalidate `classesKeys` for assignments in the save mutation, or refetch
     on return). Show the normal game results screen; optionally a "back to
     assignments" action.

### Design guardrails (recap — enforce while building)

- Selected/active = **ink fill** (`bg-primary`), never brass. Brass = the one
  CTA + the one highlighted stat per screen, ≤ ~2 uses. Hover = `bg-accent`.
- Compose `Card`/`Button`/`Dialog`/`FormField` from `shared/components/`.
- Mirror `MyFriendsView`/`FriendCard` for every list (roster, assignments,
  results) including all four states (loading skeleton, error, empty,
  populated).
- `tabular-nums` on scores/accuracy/counts. `font-display` for headings.

---

## Gotchas & non-obvious details

- **Students never receive a join code** in any response — only teachers do
  (`ClassResponse.join_code`). Don't build UI expecting it on the student side.
- **Config is snake_case for note, camelCase for generic games** — because they
  were built at different times. Store/launch exactly what the game reads;
  `sanitizeConfig` drops unknown keys so a slightly-off blob degrades to
  defaults rather than crashing.
- **The entry endpoint returns 400 (not 403) for a bad assignment tag.** Don't
  key UX off 403 there.
- **`last_attempt_date` is `""`, not null,** until the student attempts.
- **Join is idempotent** — a second join returns 200, so "already joined" isn't
  an error state to design around.
- **Archive is a soft delete** — the class vanishes from lists; there's no
  unarchive endpoint yet, so confirm before archiving.
- **Targets are optional and advisory** — the backend stores `target_accuracy`/
  `target_questions` but does not grade against them. "Met the target" is a
  frontend computation (`best_accuracy >= target_accuracy`).
- **Don't add role checks that the backend doesn't** — e.g. PARENT/BASIC roles
  exist; treat "can create classes" as `role === "TEACHER"` to match the server
  (ADMIN also can server-side, but there's no admin UI surface here).

## Out of scope (don't build)

- Grading/pass-fail enforcement, gradebook export.
- Editing an assignment after creation (there's no update endpoint — delete +
  recreate).
- Unarchiving classes, class-to-class transfers, parent views.
- Leaderboards / streaks (roadmap item 3, later).
- Any change to the music service or new Go endpoints — the contract in Part 1
  is complete; if you think you need a new endpoint, you probably don't.

## Testing

- Backend contract is covered by Go tests and a kulala HTTP suite
  (`backend/main/apitests/` — run `make test-api` with the service up); you can
  read `classes.http` to see every endpoint exercised with real
  request/response examples.
- For the frontend, add vitest tests next to what you build (the repo runs
  `npm run test:run` in CI) — at minimum cover the service mappers and the
  assignment-mode save wiring (that `assignment_id` reaches the request body).
- Before finishing: `npm run lint` (zero warnings), `npm run build` (no type
  errors), `npm run test:run`.
