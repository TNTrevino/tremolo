-- Assignment queries. The results grid is derived from
-- note_game_entries tagged with assignment_id -- there is no separate
-- submissions table to keep in sync.

-- name: CreateAssignment :one
insert into tremolo.assignments (
    class_id,
    title,
    game_type,
    config,
    due_at,
    target_questions,
    target_accuracy
)
values ($1, $2, $3, $4, $5, $6, $7)
returning *;

-- name: GetAssignmentByID :one
select *
from tremolo.assignments
where id = $1;

-- name: GetAssignmentEnrollment :one
-- One round-trip for tagging a score entry: the assignment's game type
-- plus whether the student is enrolled in its class. Used on the entry
-- write path, so it replaces a GetAssignmentByID + IsStudentInClass pair.
select a.game_type,
       exists (
           select 1
           from tremolo.class_students cs
           where cs.class_id = a.class_id
             and cs.student_id = $2
       ) as enrolled
from tremolo.assignments a
where a.id = $1;

-- name: ListAssignmentsByClass :many
select *
from tremolo.assignments
where class_id = $1
order by created_at desc;

-- name: DeleteAssignment :exec
delete from tremolo.assignments
where id = $1;

-- name: ListAssignmentsForStudent :many
-- Every assignment in the student's classes, with the student's own
-- best-attempt aggregate so the frontend can show progress.
select a.*,
       c.name as class_name,
       count(e.id)::int                          as attempt_count,
       coalesce(max(e.correct_questions), 0)::int as best_correct,
       coalesce(
           max(
               case
                   when e.total_questions > 0
                   then e.correct_questions * 100 / e.total_questions
                   else 0
               end
           ),
           0
       )::int as best_accuracy
from tremolo.class_students cs
join tremolo.classes c on c.id = cs.class_id and c.archived_at is null
join tremolo.assignments a on a.class_id = c.id
left join tremolo.note_game_entries e
    on e.assignment_id = a.id
   and e.user_id = cs.student_id
where cs.student_id = $1
group by a.id, c.name
order by a.due_at asc nulls last, a.created_at desc;

-- name: GetAssignmentResults :many
-- Teacher's results grid: one row per student in the class, with their
-- aggregate over attempts on this assignment. Students with no attempts
-- still appear (left join) so the teacher sees who hasn't started.
select u.id as student_id,
       u.first_name,
       u.last_name,
       count(e.id)::int                           as attempt_count,
       coalesce(max(e.correct_questions), 0)::int  as best_correct,
       coalesce(max(e.total_questions), 0)::int    as most_questions,
       coalesce(
           max(
               case
                   when e.total_questions > 0
                   then e.correct_questions * 100 / e.total_questions
                   else 0
               end
           ),
           0
       )::int as best_accuracy,
       coalesce(max(e.created_date)::text, '')::text as last_attempt_date
from tremolo.class_students cs
join tremolo.users u on u.id = cs.student_id
left join tremolo.note_game_entries e
    on e.assignment_id = $1
   and e.user_id = cs.student_id
where cs.class_id = $2
group by u.id, u.first_name, u.last_name
order by u.last_name, u.first_name;
