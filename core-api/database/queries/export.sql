-- Read-only queries backing GET /api/users/{userId}/export (#243). Own file
-- so parallel branches editing users.sql do not conflict with it.

-- name: GetUserForExport :one
-- The whole profile, including columns GetUserByID leaves out. Not a
-- widening of GetUserByID: that row shape feeds every /me response.
-- grade_level joins this select when #244 merges.
select u.id,
       u.first_name,
       u.last_name,
       coalesce(u.email, '') as email,
       r.name as role,
       coalesce(u.instrument, '') as instrument,
       coalesce(s.title, '') as school,
       (u.google_id is not null) as has_google,
       u.created_date,
       u.created_time
from tremolo.users u
inner join tremolo.roles r on u.role_id = r.id
left join tremolo.schools s on u.school_id = s.id
where u.id = $1;

-- name: ListGameSettingsByUser :many
-- Every per-game JSONB settings row the user has saved (key signature /
-- scale / chord identification games -- the note game has its own typed
-- table, covered separately by GetNoteGameSettings).
select game_type, config
from tremolo.game_settings
where user_id = $1
order by game_type;

-- name: ListAssignmentAttemptsByUser :many
-- Labelled per assignment/class so the export is readable by a human
-- without joining anything.
select e.id as entry_id,
       a.id as assignment_id,
       a.title as assignment_title,
       a.game_type,
       c.name as class_name,
       e.correct_questions,
       e.total_questions,
       e.notes_per_minute,
       e.time_length,
       e.created_date,
       e.created_time
from tremolo.note_game_entries e
inner join tremolo.assignments a on a.id = e.assignment_id
inner join tremolo.classes c on c.id = a.class_id
where e.user_id = $1
order by e.created_date asc, e.created_time asc, e.id asc;
