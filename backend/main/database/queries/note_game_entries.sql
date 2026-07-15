-- note_game_entries queries

-- name: CreateNoteGameEntry :one
insert into tremolo.note_game_entries (
    user_id,
    time_length,
    total_questions,
    correct_questions,
    notes_per_minute,
    game_type,
    assignment_id
)
values ($1, $2, $3, $4, $5, $6, $7)
returning id;

-- name: GetEntriesByUserID :many
select *
from tremolo.note_game_entries
where user_id = $1
order by created_date desc;

-- name: GetRecentEntriesByUserID :many
select
    id,
    user_id,
    time_length,
    total_questions,
    correct_questions,
    notes_per_minute,
    created_date
from tremolo.note_game_entries
where user_id = $1
  and game_type = $2
order by created_date desc, id desc
limit 30;

-- Chart data queries for individual users

-- name: FetchChartDataAll :many
select
    created_date,
    created_time,
    notes_per_minute,
    correct_questions,
    total_questions
from tremolo.note_game_entries
where user_id = @user_id
order by created_date, created_time asc;

-- name: FetchChartDataInRange :many
select
    created_date,
    created_time,
    notes_per_minute,
    correct_questions,
    total_questions
from tremolo.note_game_entries
where user_id = @user_id
  and created_date >= current_date - interval '1 day' * @days_back::int
order by created_date, created_time asc;

-- Teacher aggregate queries (joining with teacher_student table)

-- name: FetchTeacherChartDataAll :many
select
    nge.created_date,
    nge.created_time,
    nge.notes_per_minute,
    nge.correct_questions,
    nge.total_questions
from tremolo.note_game_entries nge
inner join tremolo.teacher_student ts on nge.user_id = ts.student_id
where ts.teacher_id = @teacher_id
order by nge.created_date, nge.created_time asc;

-- name: FetchTeacherChartDataInRange :many
select
    nge.created_date,
    nge.created_time,
    nge.notes_per_minute,
    nge.correct_questions,
    nge.total_questions
from tremolo.note_game_entries nge
inner join tremolo.teacher_student ts on nge.user_id = ts.student_id
where ts.teacher_id = @teacher_id
  and nge.created_date >= current_date - interval '1 day' * @days_back::int
order by nge.created_date, nge.created_time asc;

-- name: GetDailyActivityCounts :many
select
    created_date,
    count(*)::int as game_count
from tremolo.note_game_entries
where user_id = @user_id
  and created_date >= current_date - interval '1 day' * @days_back::int
group by created_date
order by created_date asc;

-- name: DeleteNoteGameEntryByID :exec
delete from tremolo.note_game_entries
where id = $1;

-- name: DeleteNoteGameEntriesByUserID :exec
delete from tremolo.note_game_entries
where user_id = $1;
