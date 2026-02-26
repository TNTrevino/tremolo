-- name: GetUserByEmail :one
select u.id, u.email, u.first_name, u.last_name, r.name as role, u.password
from tremolo.users u
inner join tremolo.roles r on u.role_id = r.id
where u.email = $1;

-- name: GetUserByID :one
select u.id, u.email, u.first_name, u.last_name, r.name as role, u.school_id, u.created_date
from tremolo.users u
inner join tremolo.roles r on u.role_id = r.id
where u.id = $1;

-- name: GetUserRole :one
select r.name as role
from tremolo.users u
inner join tremolo.roles r on u.role_id = r.id
where u.id = $1;

-- name: GetUsersByRole :many
select u.first_name, u.last_name, r.name as role, u.school_id
from tremolo.users u
inner join tremolo.roles r on u.role_id = r.id
where r.name = $1;

-- name: GetUserByRoleAndID :one
select u.first_name, u.last_name, r.name as role, u.school_id
from tremolo.users u
inner join tremolo.roles r on u.role_id = r.id
where r.name = $1 and u.id = $2;

-- name: GetRoleIDByName :one
select id from tremolo.roles where name = $1;

-- name: CheckAccountLocked :one
select locked_until
from tremolo.users
where email = $1 and locked_until > now();

-- name: IncrementFailedAttempts :exec
update tremolo.users
set failed_login_attempts = failed_login_attempts + 1
where email = $1;

-- name: GetFailedAttempts :one
select failed_login_attempts
from tremolo.users
where email = $1;

-- name: LockAccount :exec
update tremolo.users
set locked_until = $1
where email = $2;

-- name: ResetLockout :exec
update tremolo.users
set failed_login_attempts = 0, locked_until = null
where email = $1;

-- name: CreateUser :one
insert into tremolo.users (
    first_name,
    last_name,
    email,
    password,
    role_id,
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
returning id, first_name, last_name, email, role_id, school_id, created_date;

-- name: GetUserGeneralInfo :one
select
    u.first_name,
    u.last_name,
    r.name as role,
    u.created_date::text as created_date,
    coalesce(count(nge.id), 0)::int as total_entries,
    coalesce(sum(nge.time_length)::text, '00:00:00') as total_duration
from tremolo.users u
inner join tremolo.roles r on u.role_id = r.id
left join tremolo.note_game_entries nge on u.id = nge.user_id
where u.id = $1
group by u.id, u.first_name, u.last_name, r.name, u.created_date;

-- name: DeleteUserByID :exec
delete from tremolo.users
where id = $1;
