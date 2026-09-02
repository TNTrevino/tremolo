# Student Data Privacy Agreement (Template)

> **THIS IS A TEMPLATE. IT HAS NOT BEEN REVIEWED BY AN ATTORNEY.**
>
> This document is modeled on the Student Data Privacy Consortium (SDPC)
> National Data Privacy Agreement (NDPA) and is provided as a drafting
> starting point only. It is not legal advice, and it creates no
> obligations on its own. Before this document is signed, sent to a
> district, or relied on for any compliance purpose, it must be reviewed
> by counsel qualified in education-privacy law (FERPA, COPPA, PPRA, and
> the law of every state a signing school district sits in). Every
> `TODO(counsel)` and `TODO(owner)` marker below is a known gap, not an
> oversight — resolve them before use.
>
> Everything under Article VI ("Security Measures") and Exhibit A
> ("Schedule of Data") was checked line-by-line against the codebase on
> 2026-08-25 and cites the file that proves it, the same way
> [`docs/security.md`](../security.md) does. Everything else — the legal
> boilerplate in Articles I, IV, VII–XI — is standard NDPA-style language
> that has NOT been independently verified against Tremolo's actual
> business practices (data retention timelines, breach-response capacity,
> insurance, corporate structure) and must be before signature.

**Parties.** This Agreement is between ______________________________
Independent School District / school ("**School**" or "**LEA**") and
Tremolo ("**Provider**"), operator of the service at tremolonotes.com.

**Effective Date.** ______________________________

---

## Article I — Purpose and Scope

This Agreement governs Provider's collection, use, and protection of
Student Data in the course of providing the Tremolo service to School
under an underlying agreement, order form, or free-tier signup
(collectively, the "Service Agreement"). Where this Agreement and the
Service Agreement conflict on privacy or data-security terms, this
Agreement controls.

Provider acts as a "school official" with a "legitimate educational
interest" in Student Data under the Family Educational Rights and
Privacy Act (FERPA), 20 U.S.C. § 1232g, and its implementing regulation
at 34 CFR § 99.31(a)(1) — that is, Provider performs an institutional
service or function for which School would otherwise use its own
employees, remains under School's direct control with respect to the use
and maintenance of education records, and is bound by this Agreement not
to use Student Data for any purpose other than the one for which School
discloses it.

**TODO(counsel):** confirm this designation is made correctly under
34 CFR § 99.31(a)(1)(i)(B) (the "outsourced institutional service"
prong) given School's actual annual FERPA notice, and that the
notice-of-disclosure requirement in § 99.31(a)(1)(i)(A) is satisfied by
School's own annual notification.

## Article II — Description of Service

Tremolo is three components. Only one of them stores Student Data:

1. **Frontend** — a browser application (Angular) that renders exercises
   and forwards requests to the two services below. It stores nothing
   server-side.
2. **Music generation service** — a stateless service (Python/FastAPI)
   that generates practice exercises (sheet music, answer keys) on
   request and returns them. It has no database, no authentication, and
   retains no request history — verified by the absence of any
   database, ORM, or persistence import anywhere in `music-api/`.
3. **User tracking service** — a Go service backed by PostgreSQL
   (`core-api/`). **This is the only component that stores Student
   Data.** It holds accounts, class rosters, assignments, and practice
   score history — see Exhibit A for the complete schedule.

Tremolo carries no advertising and no third-party analytics or
advertising SDK of any kind (verified: no analytics, ad-network, or
tracking-pixel dependency anywhere in `frontend/package.json`,
`core-api/go.mod`, or `music-api/requirements.txt`), and processes no
payments — the Service carries no billing or payment-collection code
path today.

## Article III — Data Elements

The complete, field-level schedule of Student Data Provider collects is
Exhibit A. In summary, Provider collects account identity (name, email),
class/roster relationships, and practice-exercise performance data
(scores, timing, accuracy) needed to run the product.

Provider does **not** collect, and Exhibit A contains no column for:

- Social Security numbers or other government identifiers
- Precise geolocation
- Biometric identifiers
- Health, disability, or IEP/504 records
- Standardized test scores or disciplinary/attendance records
- Free-text fields of any kind tied to a student (there is no comment
  box, essay field, or chat feature anywhere a student is the author)
- Payment or financial account information
- Grade level — planned (issue #244) but not yet collected; no column
  for it exists in the schema as of this writing

## Article IV — Purpose Limitation and Prohibited Uses

Provider will use Student Data solely to provide, maintain, and improve
the Service for School's students and staff, and for no other purpose.
Without limiting the foregoing, Provider will not:

- Sell Student Data, or share it for the receiving party's own
  commercial purposes;
- Use Student Data to build, train, or improve a profile of a student
  for advertising or marketing purposes, or engage in targeted
  advertising to a student or family based on Student Data;
- Use Student Data to train a machine-learning or artificial-intelligence
  model, except a de-identified, aggregated model used solely to operate
  or improve the Service itself;
- Attempt to re-identify any data Provider has de-identified or
  aggregated.

Provider may produce and use de-identified, aggregated data (data from
which all direct and indirect student identifiers have been removed,
such that the data cannot reasonably be used to identify an individual)
for product improvement, research, or public reporting, provided
Provider does not attempt to re-identify it and contractually prohibits
any recipient of such data from doing so.

## Article V — Subprocessors

Provider's list of subprocessors as of this writing, verified against
`.github/workflows/deploy.yml` and `docs/self-hosting.md`:

| Subprocessor | Role | Data it touches |
|---|---|---|
| None (self-hosted) | Application hosting | The Service runs on hardware Provider owns and operates directly (deployed via a self-hosted GitHub Actions runner and systemd, behind a Caddy reverse proxy — see `docs/self-hosting.md` and `.github/workflows/deploy.yml`), not a third-party cloud IaaS/PaaS provider. |
| Gmail (Google Workspace/Gmail SMTP) | Transactional email relay | Recipient email address, first name, and email content (password reset, email verification, and — in the future — any other transactional mail queued by `core-api/email/`). Evidenced by `core-api/email/smtp_sender.go`, which authenticates to an external SMTP relay over mandatory TLS and special-cases Gmail's mail-threading header (`X-Entity-Ref-ID`). |
| Google (Sign in with Google) | Optional authentication | Email address and basic profile claims, only for accounts that choose "Sign in with Google" (`core-api/services/google_auth_service.go`). Not used for students who sign in with email/password. |

No other subprocessor is engaged as of this writing. Provider will give
School at least 30 days' written notice before engaging a new
subprocessor that will process Student Data, and will offer School a
reasonable opportunity to object.

**TODO(owner):** confirm the physical location (city/state/country) and
legal operator of the self-hosted server(s) referenced above — the code
confirms the Service is self-hosted rather than run on third-party
cloud infrastructure, but does not by itself establish which country the
hardware sits in. If Student Data is or may be processed outside the
United States, this Article and Article X need a cross-border-transfer
section that does not currently exist in this template.

## Article VI — Security Measures

This section mirrors, and must be kept in sync with,
[`docs/security.md`](../security.md). Every claim below cites the file
that proves it, current as of the #237 (email & account recovery) and
#238 (teacher trust) stacks.

**In place today:**

- Passwords are hashed with bcrypt at cost 12, never stored or logged in
  plaintext (`core-api/services/auth_service.go`, `BcryptCost`).
- Sign-in issues two short-lived, stateless HS256 JWTs: an access token
  (15 minutes as deployed) sent on every request, and a refresh token
  (168 hours / 7 days as deployed) sent only to the refresh endpoint
  (`core-api/middleware/auth_middleware.go`).
- Accounts lock for 15 minutes (configurable via
  `ACCOUNT_LOCKOUT_DURATION_MINUTES`) after 5 failed sign-in attempts on
  the same email, checked before any password comparison is attempted
  (`core-api/services/auth_service.go`, `MaxLoginAttempts`,
  `CheckAccountLocked`).
- All network traffic is encrypted in transit: Caddy terminates TLS via
  Let's Encrypt in front of both backend services
  (`docs/self-hosting.md`), and outbound transactional email requires
  the relay to negotiate TLS or the send fails outright
  (`core-api/email/smtp_sender.go`, `mail.WithTLSPolicy(mail.TLSMandatory)`).
- Every database query is generated by sqlc and parameterized; no
  service builds SQL by string concatenation (`core-api/database/generated/`,
  `core-api/CLAUDE.md`).
- Access to a student's data is enforced at the service layer, not just
  the UI: a caller may read their own data, or an enrolled student's
  data only if the caller owns an ACTIVE class that student is enrolled
  in — an archived class grants nothing, and probing a nonexistent user
  id returns the same 403 a real-but-unauthorized id would (never a 404),
  which keeps the endpoint from being usable to enumerate accounts
  (`core-api/services/class_service.go`, `RequireUserStatsAccess`).
  Administrative access is checked by reading the caller's role from the
  database on every request, not by trusting a claim inside their token
  (`core-api/services/roles.go`, `RequireAdmin`).
- Password-reset tokens are 32 bytes of `crypto/rand`, stored only as a
  SHA-256 hash, single-use (enforced by one conditional `UPDATE`, not a
  read-then-write), and expire after one hour
  (`core-api/services/password_reset_service.go`).
- A School account cannot self-issue teacher privileges: registering as
  TEACHER requires a valid, admin-minted invite code, redemption is a
  single conditional `UPDATE` so two signups cannot race the same code,
  and an unknown, expired, or already-spent code is indistinguishable
  from any other invalid one (`core-api/services/teacher_invite_service.go`).

**Known limitations (stated honestly, not glossed over):**

- The Service holds no third-party security certification — no SOC 2,
  no ISO 27001, no independent penetration-test report.
- Both tokens described above are stored in the browser's `localStorage`,
  not an `httpOnly` cookie. A successful XSS against the app is
  therefore a full account takeover, and there is no server-side way to
  revoke a refresh token or rotate it on refresh — a stolen refresh
  token remains usable for its full 7-day life, and changing a
  password does not invalidate tokens already issued
  (`docs/security.md`, "Known limits").
- There is no API rate limiting yet, so credential-spraying and
  mail-queue abuse are not throttled by the Service itself (tracked as
  issue #103).
- There is no audit log of who read or changed what.

School should weigh these limitations, in addition to Provider's overall
security posture, before entrusting Student Data covered by heightened
legal protection (e.g., special-education records) to the Service — none
of which the Service is designed to hold in any case (see Article III).

## Article VII — Data Retention, Deletion, and Export

Student Data is retained for as long as the corresponding account
exists — there is no automatic time-based purge — until deletion is
requested and carried out as described below, or until this Agreement
terminates under Article IX.

**Current state of self-service deletion and export — read before
relying on this Article.** The product's account settings page displays
a "Delete Account" control and a "download my data" control, but as of
this writing **neither is connected to the server**:
`submitDelete()` and `downloadData()`
(`frontend/src/app/features/account/components/account-page/account-page.component.ts`)
show the user a confirmation message and take no further action; the Go
service registers no account-deletion or data-export route at all (a
repository-wide search for a delete-account or export handler in
`core-api/controllers/` and `core-api/services/` returns nothing).
**Until self-service deletion and export ship, School's deletion and
export requests are performed manually by Provider on request** (see
Reporting/contact information below), not through the product UI.
`TODO(owner)`: prioritize shipping the self-service paths this Article
describes, or narrow this Article to describe the manual process as the
only one available.

When an account (most relevantly a teacher's) is deleted, the following
cascade is enforced by the database schema itself, not application code
that could drift from it: the classes that teacher owns are deleted,
which in turn deletes that class's roster memberships and assignments;
any student score already recorded against one of those assignments is
**not** deleted — it survives, with its assignment reference cleared, so
per-student practice history is not silently destroyed by a teacher's
account being removed
(`core-api/database/migrations/00010_classes_and_assignments.sql`: the
`classes.teacher_id` and `assignments.class_id` foreign keys are
`ON DELETE CASCADE`; `note_game_entries.assignment_id` is
`ON DELETE SET NULL`).

**Backups.** `TODO(owner)`: this template assumes routine encrypted
backups that rotate on a fixed schedule and that a completed deletion is
re-applied after any restore from backup, which is standard practice —
but no backup tooling, script, or schedule exists anywhere in this
repository as of this writing. Confirm the actual backup regime (or lack
of one) with Provider's infrastructure owner and correct this paragraph
before this Agreement is signed; do not represent a backup/restore
discipline to a school district that does not exist yet.

## Article VIII — Data Breach

Provider will notify School without unreasonable delay, and in no event
later than 72 hours after Provider becomes aware of a breach of security
resulting in unauthorized acquisition of Student Data. The notice will
describe, to the extent then known: the nature of the breach, the
categories and approximate number of students affected, the data
elements involved, and the remedial steps Provider has taken or plans to
take. Provider will cooperate with School's own investigation and
notification obligations, and will bear the cost of notifying affected
individuals where the breach is attributable to Provider's failure to
meet its obligations under this Agreement.

`TODO(counsel)`: confirm the 72-hour figure against any state breach-notification
statute that applies to School's students (timelines vary by
state and by whether the data includes items beyond directory
information), and against Provider's actual incident-response capacity
— a commitment the template should not overstate.

## Article IX — Termination and Disposition of Data

This Agreement terminates automatically when the Service Agreement
terminates. Within 30 days of termination, Provider will, at School's
written election, either return all Student Data to School in a
commonly-used electronic format or securely destroy it (including from
backups, on backup media's normal rotation schedule — see Article VII),
and will certify completion in writing using Exhibit C. Provider may
retain Student Data beyond 30 days only to the extent required by law,
and only for as long as that requirement lasts.

## Article X — Applicable Student-Privacy Law

Provider's role and obligations under FERPA are addressed in Article I.
This Article addresses the other federal and state regimes commonly
implicated by K-12 education technology:

- **COPPA** (Children's Online Privacy Protection Act, applicable to
  services directed at or knowingly collecting data from children under
  13): Provider relies on School's consent on behalf of parents for
  students under 13, consistent with the FTC's "school consent"
  doctrine for services used for a genuine educational purpose and
  where School has reviewed the practices described in this Agreement.
  School represents that it has, or will obtain, the authority to
  provide that consent for its students.
- **PPRA** (Protection of Pupil Rights Amendment): the Service does not
  administer surveys, and collects no data of the categories PPRA
  restricts (political affiliations, mental or psychological problems,
  sex behavior, illegal or self-incriminating behavior, critical
  appraisals of family members, legally privileged relationships,
  religious practices, or income) — see Article III.
- **State student-privacy law**: `TODO(counsel)` — the following are
  STARTING POINTS for research, not confirmed citations, and must be
  verified (and expanded to cover every state a signing district sits
  in) before this Agreement is used: Texas Education Code Chapter 32,
  Subchapter D (student data privacy in public schools), and Texas
  Business & Commerce Code Chapter 541 (the state's general data-privacy
  statute). Neither citation has been checked against current statute
  text as part of this drafting pass.

## Article XI — General Provisions

**Governing law.** This Agreement is governed by the law of the State of
______________________________, without regard to conflict-of-laws
principles. `TODO(counsel)`: fill in — typically the signing school
district's state, not Provider's.

**Assignment.** Neither party may assign this Agreement without the
other's prior written consent, except to a successor in a merger,
acquisition, or sale of substantially all assets, provided the successor
assumes all obligations under this Agreement.

**Severability.** If any provision of this Agreement is held
unenforceable, the remaining provisions remain in full force.

**Entire agreement.** This Agreement, together with the Service
Agreement and its Exhibits, is the entire agreement between the parties
regarding Student Data privacy and supersedes any prior agreement on
that subject.

**Amendment.** This Agreement may be amended only by a written
instrument signed by both parties, except that Provider may update
Exhibit A (Schedule of Data) and Exhibit B (Services) by written notice
to School to reflect product changes, provided the update does not
expand the purposes for which Student Data is used beyond Article IV.

**Notice.** Notices under this Agreement go to the addresses in the
signature blocks below, or such other address as a party designates in
writing.

**SDPC general offer.** `TODO(owner)`: the SDPC NDPA framework allows a
signed agreement to be extended to it as a "General Offer of Terms" that
other districts may accept without separate negotiation. Decide whether
Provider wants to make that offer, and if so, complete the SDPC's
General Offer of Terms form separately — it is not included here.

---

## Exhibit A — Schedule of Data

Every column below was read directly from the migration that creates it.
Rows marked **(in-flight)** exist on an open feature branch/PR, not yet
on `main` — they are included because this Agreement is meant to
describe the service as it will exist once the #237 and #238 stacks
land, the same convention `docs/security.md` uses; verify they have
actually merged before relying on this Exhibit.

### Accounts and roster

| Table | Fields | Notes |
|---|---|---|
| `users` | `id`, `first_name`, `last_name`, `email`, `password` (bcrypt hash; NULL for a Google-only account), `role_id` (STUDENT/TEACHER/PARENT/ADMIN/BASIC), `google_id` (NULL unless "Sign in with Google" is used), `failed_login_attempts`, `locked_until`, `school_id`, `instrument`, `created_date`, `created_time` | `school_id` and `instrument` columns exist (`00001_initial_schema.sql`, `00002_friends.sql`) but no current screen writes either one — the account page lists "Set school affiliation" and "Choose primary instrument" as *proposed, unbuilt* features (`frontend/src/app/features/account/components/profile-page/profile-page.component.ts`). Treat both as effectively uncollected today. |
| `users.email_verified_at` **(in-flight, #237)** | timestamp the address was confirmed, or NULL | Set by a mailed verification link, or automatically for Google-authenticated addresses. |
| — grade level | *(does not exist yet)* | Planned under issue #244; no column exists in the schema as of this writing. Do not represent that grade level is collected until this row is updated. |
| `schools` | `id`, `title`, `city`, `county`, `state`, `country`, `created_date`, `created_time` | Referenced by `users.school_id`, which — see above — no screen currently populates. |
| `classes` | `id`, `teacher_id`, `name`, `join_code`, `archived_at`, `created_at` | One row per class a teacher creates; students join with `join_code`. |
| `class_students` | `class_id`, `student_id`, `joined_at` | Roster join table. |
| `assignments` | `id`, `class_id`, `title`, `game_type`, `config` (JSON), `due_at`, `target_questions`, `target_accuracy`, `created_at` | A frozen snapshot of a game configuration assigned to a class. |
| `friends` | `user_id`, `friend_id`, `created_date`, `created_time` | Mutual peer connection, both sides students or staff. |
| `teacher_student`, `teacher_parent`, `parent_child` | Foreign-key pairs only (e.g. `teacher_id`, `student_id`) | Legacy tables from the original schema (`00001_initial_schema.sql`). No current service creates or reads rows in any of the three — a repository-wide search finds only best-effort cleanup `DELETE` queries (`core-api/database/queries/relationships.sql`) with no caller. Listed for completeness; they are not part of any live feature. |

### Practice activity

| Table | Fields | Notes |
|---|---|---|
| `note_game_entries` | `id`, `user_id`, `time_length`, `total_questions`, `correct_questions`, `notes_per_minute`, `game_type`, `assignment_id` (nullable), `created_date`, `created_time` | One row per completed practice session, across every game type (`game_type` discriminates; empty string normalizes to `"note"`). |
| `note_game_settings` | `id`, `user_id`, `game_mode`, `time_limit`, `note_limit`, `scale`, `octave`, `low_note`, `high_note`, `clef` | Per-user saved settings for the note-reading game specifically. |
| `game_settings` | `id`, `user_id`, `game_type`, `config` (JSON) | Per-user saved settings for every other game. |
| `keyboard_bindings` | `id`, `user_id`, plus 21 columns (`key_c` … `key_b_flat`) | A student's custom keyboard-to-note mapping. Preference data, not performance data. |

### Account-recovery and messaging (in-flight, #237)

| Table | Fields | Notes |
|---|---|---|
| `password_reset_tokens` | `id`, `user_id`, `token_hash` (SHA-256 hash only — the plaintext token is never stored), `expires_at`, `used_at`, `created_at` | One-hour lifetime, single use. |
| `email_tokens` | `id`, `user_id`, `purpose` (`verify_email` or `change_email`), `token_hash` (SHA-256 hash only), `email`, `expires_at`, `used_at`, `created_at` | 24-hour lifetime, single use. |
| `queued_emails` | `id`, `recipient`, `recipient_name`, `subject`, `template`, `body_html`, `body_text`, `message_id`, `status`, `attempts`, `max_attempts`, `next_attempt_at`, `claimed_at`, `sent_at`, `last_error`, `created_at`, `updated_at` | The rendered content of every transactional email sent (password reset, verification), queued for delivery. |
| `email_send_attempts` | `id`, `queued_email_id`, `attempt_number`, `succeeded`, `error`, `attempted_at` | Delivery-attempt log for the row above; no message content, only outcome. |

### Teacher trust (in-flight, #238)

| Table | Fields | Notes |
|---|---|---|
| `teacher_invite_codes` | `id`, `code`, `note`, `max_uses`, `use_count`, `expires_at`, `created_by`, `created_at` | Not student-linked; minted by an admin to gate teacher self-registration. |

### Operational data (not a "record about a student" in the FERPA sense, but disclosed for completeness)

- `users.failed_login_attempts` / `users.locked_until` — brute-force counters, described in Article VI.
- Application server logs include the email address associated with a
  sign-in attempt (login, lockout, and registration log lines in
  `core-api/services/auth_service.go` all include the `email` field) —
  this is a real, currently-unresolved limitation, not a designed
  feature; see `docs/security.md`, "Known limits."

## Exhibit B — Description of Services

| Capability | Provided? |
|---|---|
| Practice games (note reading, interval/scale/chord/key-signature identification) | Yes |
| Server-generated exercises and answer keys | Yes |
| Classes, rosters, and join-code enrollment | Yes |
| Teacher-assigned practice with due dates and targets | Yes |
| Self-service account data export | **No** — not yet implemented; see Article VII |
| Self-service account deletion | **No** — not yet implemented; see Article VII |
| Rostering integrations (Clever, ClassLink, or similar) | No |
| Single sign-on beyond "Sign in with Google" | No |
| Payment processing | No — the Service has no billing code path |
| Advertising or ad-network integration | No |
| Third-party analytics | No |

## Exhibit C — Data Disposition Directive

Upon termination of this Agreement (Article IX), School directs Provider
to (select one):

☐ **Return** all Student Data to School in the following format and via
the following method: ______________________________

☐ **Destroy** all Student Data, including copies held in backups, on
those backups' normal rotation schedule, and certify destruction in
writing below.

Provider certifies that, within 30 days of the above election having
been carried out, all Student Data described in Exhibit A has been
returned or destroyed in accordance with School's election above.

Certified by (Provider): ______________________________  Date: __________

---

## Signatures

**For School / LEA:**

Name: ______________________________
Title: ______________________________
Signature: ______________________________
Date: ______________________________
Address: ______________________________

**For Provider (Tremolo):**

Name: ______________________________
Title: ______________________________
Signature: ______________________________
Date: ______________________________
Email: contact@tremolonotes.com
Address: ______________________________

<!-- TODO(owner): add Provider's postal address (required for a notices
clause to mean anything), and confirm contact@tremolonotes.com is the
address that should appear on a document sent to school districts,
before this template is used outside this repository. -->
