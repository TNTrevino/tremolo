# Student privacy posture: the grade-level signal

This document explains one column: `tremolo.users.grade_level`, added in
`core-api/database/migrations/00015_user_grade_level.sql` and collected
optionally at signup (#244). It exists so that a design decision with real
privacy consequences has a written justification next to it, not just a
migration comment.

## The signal

`grade_level` is a nullable `varchar(16)` holding one of `"6"` through
`"12"`, or `"other"`. It is supplied once, by the account holder, at
registration:

- A **student** signing up through `/signup` may pick a grade from a
  dropdown. Picking one is required for that role; the value travels to
  the API as `grade_level` and is validated against the same allowed set
  server-side (`core-api/DTOs/auth_dtos.go`).
- **Every other path leaves it `NULL`.** A teacher is never asked (the
  field does not render for that role, and the API does not require it
  for any role). A Google sign-in is never asked --
  `CreateOAuthUser` has no `grade_level` column in its insert list at all.
  An account created by an admin (`POST /user`) is never asked -- nobody
  filled out the form that asks. And every account created before this
  migration shipped simply has nothing in the column, because the
  question did not exist yet.

NULL is therefore not an edge case to handle -- it is the default, and it
will remain the majority value for a long time. Nothing in this app
requires it to be filled in.

## It is a grade, not a birth date

The obvious alternative design -- ask for a birth date, or a birth year --
was considered and rejected. A birth year is a direct identifier: it is
named specifically in FERPA's definition of personally identifiable
information, and in the student-data-privacy statutes most states have
layered on top of FERPA. A grade level is different in kind, not just in
precision -- it is a school-context attribute (which classroom a student
is in) that the school issuing the account already holds and already
uses, the same way a roster or a class period does.

Nothing this field feeds needs birth-year precision. It gates no feature,
unlocks no content, and drives no branch in the code beyond a courtesy
message on the signup form (see "What it does not do" below). Given that,
collecting the more sensitive value -- a real birth date -- to answer a
question that a coarse, self-reported grade already answers well enough
would contradict the minimization commitment this document exists to
describe: collect the least sensitive fact that does the job, and no
more.

## What it does not do

To be explicit about the boundary, because it is easy to assume a field
like this does more than it does:

- It does not gate anything. There is no age wall, no "you must be 13"
  checkbox, and no code path that reads `grade_level` to allow or deny a
  feature. Grep the codebase: the only places this column is read are the
  registration insert and this document's own reasoning about it.
- It creates no consent flow. Filling it in does not trigger an email,
  a parent-notification step, or a different account type.
- It is a hint, not a determination. A grade is not an age. A retained
  8th grader answering "7" may be 13, 14 or 15; an accelerated student
  in the same grade may be younger than the band suggests either way.
  Treat any inference drawn from this field as approximate, because it
  is self-reported, optional, and only loosely correlated with age in
  the first place.

## The posture

This app is used by students under 13, and COPPA's ordinary rule is that
collecting personal information from a child that age requires
verifiable parental consent, obtained directly by the operator. This app
does not collect that consent directly. Instead it relies on COPPA's
**school-consent doctrine**: a school may consent on a parent's behalf
when a tool is used for an educational purpose under the school's
direction, collection is limited to what that educational purpose needs,
and the data is not used or disclosed for any other commercial purpose.
The Department of Education's guidance on FERPA's "school official"
exception runs alongside this and points the same direction: a vendor
acting as a school official, under the school's control, for a legitimate
educational purpose, does not need separate consent per student either.

The DPA each school signs (Article X.2) is where that arrangement is
actually recorded -- it is the document a school can point to as the
basis for its own consent-on-behalf-of-parents determination. This
document explains the reasoning behind one field; the DPA is the
instrument that makes the reasoning binding.

That doctrine is only available because of what this app actually does,
independent of any one user's age:

- **Minimal collection.** Signup asks for a name, an email, a password,
  a role, and now, optionally, a grade -- not a birth date, not a phone
  number, not a physical address.
- **No ads, no third-party analytics.** Nothing here is monetized off
  student attention or student data.
- **No selling of data**, to anyone, for any purpose.
- **Narrow visibility.** A student's data is visible to that student and
  to the teacher of a class they are actively enrolled in -- not to
  other students, not to teachers they have no class with.
- **Teacher accounts cannot be self-issued.** The TEACHER role is
  reachable only by redeeming an admin-minted invite code at signup or
  by direct admin creation (`core-api/CLAUDE.md`, "A TEACHER row reaches
  the database through exactly two routes") -- a stranger cannot grant
  themselves visibility into student data by registering.
- **Self-service control over one's own data, on the way.** Both
  account deletion (#202) and a data export (#243) are being added
  this cycle -- today's delete button is UI-only and does not yet
  reach a backend route. Until those ship, a user, a parent, or a
  school can request deletion or export by emailing us, and we act on
  it by hand.

### Accounts with no signal, and accounts below grade 7

Put plainly: **an account with no grade on file and an account with a
grade below 7 are treated identically -- as possibly belonging to a
child under 13.** The mitigations above are not conditioned on this
field being present, let alone accurate. A NULL `grade_level` does not
relax any protection, and a grade of "6" does not tighten one. This is
by design: the posture above already assumes the userbase includes
children under 13 and is built to hold regardless of who, individually,
actually is one. The field is a UX nicety -- letting the product know
roughly who it is talking to -- not a control this app's compliance
story leans on. That is exactly why it can be optional and unverified
without weakening anything.

## What would change this

The posture above holds only as long as the facts underneath it stay
true. Any of the following would take this app outside the
school-consent doctrine and require real, verifiable, direct parental
consent (COPPA's default rule) before it could ship:

- **Advertising**, of any kind, targeted or not.
- **Third-party analytics** that share user-level data off-platform.
- **Public leaderboards** or any feature that publishes a student's
  identity or performance outside their own class.
- **Student-to-student messaging** or any other feature that lets
  students communicate through the app.
- **User uploads** of files, images, or other content.
- **Any disclosure of student data outside the school relationship** --
  to a data broker, a marketing partner, or any other third party the
  DPA does not already cover.

None of these are implemented today. If one of them is proposed, this
document is the gate it needs to clear first -- not as a formality, but
because the reasoning above stops holding the moment any of them ships.
