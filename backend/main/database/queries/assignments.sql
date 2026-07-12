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

-- name: GetAssignmentAttempts :many
-- Every attempt (score entry) tagged with the assignment for one
-- student, oldest to newest -- the drill-down behind the results grid.
select e.correct_questions,
       e.total_questions,
       case
           when e.total_questions > 0
           then e.correct_questions * 100 / e.total_questions
           else 0
       end as accuracy,
       e.notes_per_minute,
       coalesce(e.created_date, current_date)::text as attempted_date,
       coalesce(e.created_time, '00:00:00'::time)::text as attempted_time
from tremolo.note_game_entries e
where e.assignment_id = $1
  and e.user_id = $2
order by e.created_date asc, e.created_time asc, e.id asc;

-- name: ListAssignmentsForStudent :many
-- Every assignment in the student's classes, with the student's own
-- best attempt so the frontend can show progress. "Best" is one real
-- attempt (highest accuracy, ties broken by most correct), not each
-- column maxed independently -- otherwise best_correct and best_accuracy
-- could come from different attempts.
select a.*,
       c.name as class_name,
       coalesce(agg.attempt_count, 0)::int as attempt_count,
       coalesce(best.correct_questions, 0)::int as best_correct,
       coalesce(best.accuracy, 0)::int as best_accuracy
from tremolo.class_students cs
join tremolo.classes c on c.id = cs.class_id and c.archived_at is null
join tremolo.assignments a on a.class_id = c.id
left join lateral (
    select count(*)::int as attempt_count
    from tremolo.note_game_entries e
    where e.assignment_id = a.id
      and e.user_id = cs.student_id
) agg on true
left join lateral (
    select e.correct_questions,
           case
               when e.total_questions > 0
               then e.correct_questions * 100 / e.total_questions
               else 0
           end as accuracy
    from tremolo.note_game_entries e
    where e.assignment_id = a.id
      and e.user_id = cs.student_id
    order by (case
                  when e.total_questions > 0
                  then e.correct_questions * 100 / e.total_questions
                  else 0
              end) desc,
             e.correct_questions desc
    limit 1
) best on true
where cs.student_id = $1
order by a.due_at asc nulls last, a.created_at desc;

-- name: GetAssignmentResults :many
-- Teacher's results grid: one row per student in the class. Students
-- with no attempts still appear (attempt_count 0) so the teacher sees
-- who hasn't started. best_correct / most_questions / best_accuracy all
-- describe the SAME best attempt (highest accuracy, ties broken by most
-- correct), not columns maxed independently across different attempts.
select u.id as student_id,
       u.first_name,
       u.last_name,
       coalesce(agg.attempt_count, 0)::int as attempt_count,
       coalesce(best.correct_questions, 0)::int as best_correct,
       coalesce(best.total_questions, 0)::int as most_questions,
       coalesce(best.accuracy, 0)::int as best_accuracy,
       coalesce(agg.last_attempt_date, '')::text as last_attempt_date
from tremolo.class_students cs
join tremolo.users u on u.id = cs.student_id
left join lateral (
    select count(*)::int as attempt_count,
           max(e.created_date)::text as last_attempt_date
    from tremolo.note_game_entries e
    where e.assignment_id = $1
      and e.user_id = cs.student_id
) agg on true
left join lateral (
    select e.correct_questions,
           e.total_questions,
           case
               when e.total_questions > 0
               then e.correct_questions * 100 / e.total_questions
               else 0
           end as accuracy
    from tremolo.note_game_entries e
    where e.assignment_id = $1
      and e.user_id = cs.student_id
    order by (case
                  when e.total_questions > 0
                  then e.correct_questions * 100 / e.total_questions
                  else 0
              end) desc,
             e.correct_questions desc
    limit 1
) best on true
where cs.class_id = $2
order by u.last_name, u.first_name;
