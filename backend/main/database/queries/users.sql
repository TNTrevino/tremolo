-- name: GetUserByEmail :one
select id, email, first_name, last_name, role, password
from users
where email = $1;

-- name: GetUserByID :one
select id, email, first_name, last_name, role, school_id, created_date
from users
where id = $1;

-- name: GetUserRole :one
select role
from users
where id = $1;

-- name: GetUsersByRole :many
select first_name, last_name, role, school_id
from users
where role = $1;

-- name: GetUserByRoleAndID :one
select first_name, last_name, role, school_id
from users
where role = $1 and id = $2;

-- name: CheckAccountLocked :one
select locked_until
from users
where email = $1 and locked_until > now();

-- name: IncrementFailedAttempts :exec
update users
set failed_login_attempts = failed_login_attempts + 1
where email = $1;

-- name: GetFailedAttempts :one
select failed_login_attempts
from users
where email = $1;

-- name: LockAccount :exec
update users
set locked_until = $1
where email = $2;

-- name: ResetLockout :exec
update users
set failed_login_attempts = 0, locked_until = null
where email = $1;

-- name: CreateUser :one
insert into users (
    first_name,
    last_name,
    email,
    password,
    role,
    school_id
)
values (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
)
returning id, first_name, last_name, email, role, school_id, created_date;

-- name: GetUserGeneralInfo :one
select
    u.first_name,
    u.last_name,
    u.role,
    u.created_date::text as created_date,
    coalesce(count(nge.id), 0)::int as total_entries,
    coalesce(sum(nge.time_length)::text, '00:00:00') as total_duration
from users u
left join note_game_entries nge on u.id = nge.user_id
where u.id = $1
group by u.id, u.first_name, u.last_name, u.role, u.created_date;

-- name: DeleteUserByID :exec
delete from users
where id = $1;
