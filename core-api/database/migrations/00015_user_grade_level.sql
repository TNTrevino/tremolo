-- Optional grade-level signal at signup (#244).
-- A grade, not a birth date: a birth year is a direct identifier under
-- FERPA's PII definition and every state student-privacy statute, while a
-- grade is a school-context attribute the school already holds. Nothing in
-- this app gates on age, so nothing needs birth-year precision -- see
-- docs/legal/student-privacy-posture.md for the full argument.
--
-- Nullable, and staying nullable: "declined to say" and "created before we
-- asked" must both be representable, and both are simply NULL -- the two
-- must not be distinguishable in the data.
--
-- varchar(16), not smallint: the allowed values are "6".."12" and "other",
-- and "other" is an answer, not a missing value, so this cannot be a
-- number with a sentinel.
--
-- No CHECK constraint. The allowed set lives in the DTO's validation map
-- (core-api/DTOs/auth_dtos.go), the same place role and game_mode live --
-- adding a value there needs no migration.
--
-- Numbering: 00012 (email queue), 00013 (password resets) and 00014
-- (email verification) are claimed on other branches and not present here.
-- The gap is fine; goose only hard-fails on a duplicate version, not a
-- skipped one.

-- +goose Up
alter table tremolo.users add column grade_level varchar(16);

-- +goose Down
alter table tremolo.users drop column if exists grade_level;
