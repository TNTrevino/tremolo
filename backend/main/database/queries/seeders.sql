-- name: CreateSchool :one
insert into schools (
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
insert into users (
  first_name,
  last_name,
  school_id,
  role,
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
insert into teacher_student (
  teacher_id,
  student_id
)
values (
  $1,
  $2
);

-- name: CreateNoteGameEntryWithDate :one
insert into note_game_entries (
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
delete from note_game_entries;
delete from teacher_student;
delete from teacher_parent;
delete from parent_child;
delete from users;
delete from schools;
