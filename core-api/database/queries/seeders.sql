-- name: CreateSchool :one
insert into tremolo.schools (
  title,
  city,
  county,
  state,
  country,
  created_time,
  created_date
)
values (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7
)
returning id;

-- name: CreateUserWithPassword :one
insert into tremolo.users (
  first_name,
  last_name,
  school_id,
  role_id,
  email,
  password
)
values (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6
)
returning id;

-- name: CreateTeacherStudentAssociation :exec
insert into tremolo.teacher_student (
  teacher_id,
  student_id
)
values (
  $1,
  $2
);

-- name: CreateNoteGameEntryWithDate :one
insert into tremolo.note_game_entries (
  user_id,
  time_length,
  total_questions,
  correct_questions,
  notes_per_minute,
  created_date,
  created_time
)
values (
  $1,
  $2,
  $3,
  $4,
  $5,
  $6,
  $7
)
returning id;

-- name: DeleteAllTestData :exec
delete from tremolo.friends;
delete from tremolo.note_game_entries;
delete from tremolo.teacher_student;
delete from tremolo.teacher_parent;
delete from tremolo.parent_child;
delete from tremolo.users;
delete from tremolo.schools;
