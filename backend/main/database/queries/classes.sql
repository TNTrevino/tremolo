-- Class + roster queries. Ownership checks (teacher_id = caller) happen
-- in the service layer by comparing against the fetched row.

-- name: CreateClass :one
insert into tremolo.classes (teacher_id, name, join_code)
values ($1, $2, $3)
returning *;

-- name: GetClassByID :one
select *
from tremolo.classes
where id = $1;

-- name: GetClassByJoinCode :one
select *
from tremolo.classes
where join_code = $1
  and archived_at is null;

-- name: ListClassesByTeacher :many
select c.*,
       count(cs.student_id)::int as student_count
from tremolo.classes c
left join tremolo.class_students cs on cs.class_id = c.id
where c.teacher_id = $1
  and c.archived_at is null
group by c.id
order by c.created_at desc;

-- name: ListClassesByStudent :many
select c.*,
       u.first_name as teacher_first_name,
       u.last_name  as teacher_last_name
from tremolo.class_students cs
join tremolo.classes c on c.id = cs.class_id
join tremolo.users u on u.id = c.teacher_id
where cs.student_id = $1
  and c.archived_at is null
order by cs.joined_at desc;

-- name: ArchiveClass :exec
update tremolo.classes
set archived_at = now()
where id = $1;

-- name: AddStudentToClass :exec
insert into tremolo.class_students (class_id, student_id)
values ($1, $2)
on conflict (class_id, student_id) do nothing;

-- name: RemoveStudentFromClass :exec
delete from tremolo.class_students
where class_id = $1
  and student_id = $2;

-- name: IsStudentInClass :one
select exists (
    select 1
    from tremolo.class_students
    where class_id = $1
      and student_id = $2
);

-- name: ListClassRoster :many
select u.id,
       u.first_name,
       u.last_name,
       cs.joined_at
from tremolo.class_students cs
join tremolo.users u on u.id = cs.student_id
where cs.class_id = $1
order by u.last_name, u.first_name;
