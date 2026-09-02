-- Classes and assignments (ROADMAP item 1: the teacher tier).
--
-- Shape:
--   classes           one row per class a teacher owns; students join
--                     with a short join_code instead of teacher invites.
--   class_students    pure roster join table. The legacy teacher_student
--                     table is untouched; class membership is the roster
--                     for assignments.
--   assignments       a frozen game config (JSONB snapshot, NOT a FK to
--                     game_settings -- those are per-user and mutable) +
--                     due date + optional targets.
--   note_game_entries gains a nullable assignment_id: an "attempt" IS a
--                     score entry tagged with the assignment, so the
--                     results grid is derived by aggregation instead of
--                     duplicating scores into a submissions table.

-- +goose Up
create table tremolo.classes (
    id serial primary key,
    teacher_id int not null references tremolo.users (id) on delete cascade,
    name varchar(255) not null,
    join_code varchar(8) not null unique,
    archived_at timestamptz,
    created_at timestamptz not null default now()
);

create index idx_classes_teacher on tremolo.classes (teacher_id);

create table tremolo.class_students (
    class_id int not null references tremolo.classes (id) on delete cascade,
    student_id int not null references tremolo.users (id) on delete cascade,
    joined_at timestamptz not null default now(),
    primary key (class_id, student_id)
);

create index idx_class_students_student
on tremolo.class_students (student_id);

create table tremolo.assignments (
    id serial primary key,
    class_id int not null references tremolo.classes (id) on delete cascade,
    title varchar(255) not null,
    game_type varchar(30) not null,
    config jsonb not null default '{}'::jsonb,
    due_at timestamptz,
    target_questions int check (target_questions > 0),
    target_accuracy int check (target_accuracy between 1 and 100),
    created_at timestamptz not null default now()
);

create index idx_assignments_class on tremolo.assignments (class_id);

alter table tremolo.note_game_entries
add column assignment_id int references tremolo.assignments (id)
on delete set null;

create index idx_note_game_entries_assignment
on tremolo.note_game_entries (assignment_id)
where assignment_id is not null;

-- +goose Down
drop index if exists tremolo.idx_note_game_entries_assignment;
alter table tremolo.note_game_entries drop column if exists assignment_id;
drop table if exists tremolo.assignments;
drop table if exists tremolo.class_students;
drop table if exists tremolo.classes;
