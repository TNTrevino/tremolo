-- Real account deletion (#202) needs one thing the schema has never had:
-- a user row that can actually be deleted.
--
-- Six tables reference tremolo.users with NO on-delete action at all --
-- note_game_entries.user_id, friends.user_id, friends.friend_id,
-- teacher_student.{teacher_id,student_id}, teacher_parent.{teacher_id,
-- parent_id}, parent_child.{parent_id,child_id} (nine FK constraints in
-- total, named by Postgres's default <table>_<column>_fkey and confirmed
-- against a live database before writing this migration, not assumed
-- from the CREATE TABLE statements). Right now DeleteUserByID
-- (database/queries/users.sql) is exercised only by
-- tests/testutil.DeleteTestUser, which hand-deletes a few of these
-- tables (note_game_entries, teacher_student) before calling it and
-- still leaves friends, teacher_parent and parent_child untouched -- a
-- user with any of those rows makes DeleteUserByID fail with a foreign
-- key violation.
--
-- services/account_service.go's DeleteAccount cannot paper over that the
-- way testutil does: services here take generated.Querier, not a
-- transaction-capable type, so a delete built out of several statements
-- has no way to roll all of them back together. A half-deleted account
-- -- gone from users but still leaking rows in friends or
-- teacher_student -- is exactly the failure the privacy policy's
-- deletion promise says cannot happen. The only shape that guarantees
-- "one statement or nothing" is a single `delete from tremolo.users`
-- that the database itself cascades, which means the foreign keys have
-- to carry ON DELETE CASCADE instead of the service carrying the
-- cleanup logic.
--
-- Already correct, and untouched here: note_game_settings, game_settings
-- and keyboard_bindings all cascade on their user_id FK (migrations
-- 00004, 00008, 00005); classes.teacher_id and class_students.* cascade
-- (00010); password_reset_tokens and email_tokens both cascade on
-- user_id (00013, 00014); teacher_invite_codes.created_by is ON DELETE
-- SET NULL, added on a different stack. note_game_entries.assignment_id
-- is also already ON DELETE SET NULL (00010) and stays that way: it is
-- not one of the nine broken constraints below, and deliberately so --
-- see that migration's column and the Down note here.
--
-- Not covered here because there is no FK to cascade: queued_emails keys
-- on the recipient ADDRESS STRING, not a user id, so a deleted account's
-- outstanding mail is never reachable from a cascade. DeleteAccount
-- deletes those rows explicitly (DeleteQueuedEmailsByRecipient) before
-- it deletes the user.

-- +goose Up
alter table tremolo.note_game_entries drop constraint note_game_entries_user_id_fkey;
alter table tremolo.note_game_entries
add constraint note_game_entries_user_id_fkey
foreign key (user_id) references tremolo.users (id) on delete cascade;

alter table tremolo.friends drop constraint friends_user_id_fkey;
alter table tremolo.friends
add constraint friends_user_id_fkey
foreign key (user_id) references tremolo.users (id) on delete cascade;

alter table tremolo.friends drop constraint friends_friend_id_fkey;
alter table tremolo.friends
add constraint friends_friend_id_fkey
foreign key (friend_id) references tremolo.users (id) on delete cascade;

alter table tremolo.teacher_student drop constraint teacher_student_teacher_id_fkey;
alter table tremolo.teacher_student
add constraint teacher_student_teacher_id_fkey
foreign key (teacher_id) references tremolo.users (id) on delete cascade;

alter table tremolo.teacher_student drop constraint teacher_student_student_id_fkey;
alter table tremolo.teacher_student
add constraint teacher_student_student_id_fkey
foreign key (student_id) references tremolo.users (id) on delete cascade;

alter table tremolo.teacher_parent drop constraint teacher_parent_teacher_id_fkey;
alter table tremolo.teacher_parent
add constraint teacher_parent_teacher_id_fkey
foreign key (teacher_id) references tremolo.users (id) on delete cascade;

alter table tremolo.teacher_parent drop constraint teacher_parent_parent_id_fkey;
alter table tremolo.teacher_parent
add constraint teacher_parent_parent_id_fkey
foreign key (parent_id) references tremolo.users (id) on delete cascade;

alter table tremolo.parent_child drop constraint parent_child_parent_id_fkey;
alter table tremolo.parent_child
add constraint parent_child_parent_id_fkey
foreign key (parent_id) references tremolo.users (id) on delete cascade;

alter table tremolo.parent_child drop constraint parent_child_child_id_fkey;
alter table tremolo.parent_child
add constraint parent_child_child_id_fkey
foreign key (child_id) references tremolo.users (id) on delete cascade;

-- +goose Down
-- Down restores the state where deleting a user with history fails --
-- the bug this migration removes. That is the correct rollback target
-- (matching what each column referenced before this file), not a
-- judgment that the plain reference was fine to leave.
alter table tremolo.note_game_entries drop constraint note_game_entries_user_id_fkey;
alter table tremolo.note_game_entries
add constraint note_game_entries_user_id_fkey
foreign key (user_id) references tremolo.users (id);

alter table tremolo.friends drop constraint friends_user_id_fkey;
alter table tremolo.friends
add constraint friends_user_id_fkey
foreign key (user_id) references tremolo.users (id);

alter table tremolo.friends drop constraint friends_friend_id_fkey;
alter table tremolo.friends
add constraint friends_friend_id_fkey
foreign key (friend_id) references tremolo.users (id);

alter table tremolo.teacher_student drop constraint teacher_student_teacher_id_fkey;
alter table tremolo.teacher_student
add constraint teacher_student_teacher_id_fkey
foreign key (teacher_id) references tremolo.users (id);

alter table tremolo.teacher_student drop constraint teacher_student_student_id_fkey;
alter table tremolo.teacher_student
add constraint teacher_student_student_id_fkey
foreign key (student_id) references tremolo.users (id);

alter table tremolo.teacher_parent drop constraint teacher_parent_teacher_id_fkey;
alter table tremolo.teacher_parent
add constraint teacher_parent_teacher_id_fkey
foreign key (teacher_id) references tremolo.users (id);

alter table tremolo.teacher_parent drop constraint teacher_parent_parent_id_fkey;
alter table tremolo.teacher_parent
add constraint teacher_parent_parent_id_fkey
foreign key (parent_id) references tremolo.users (id);

alter table tremolo.parent_child drop constraint parent_child_parent_id_fkey;
alter table tremolo.parent_child
add constraint parent_child_parent_id_fkey
foreign key (parent_id) references tremolo.users (id);

alter table tremolo.parent_child drop constraint parent_child_child_id_fkey;
alter table tremolo.parent_child
add constraint parent_child_child_id_fkey
foreign key (child_id) references tremolo.users (id);
