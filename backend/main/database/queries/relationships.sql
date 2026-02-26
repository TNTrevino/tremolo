-- relationship queries

-- name: DeleteTeacherStudentRelationship :exec
delete from tremolo.teacher_student
where teacher_id = $1 and student_id = $2;

-- name: DeleteTeacherParentRelationship :exec
delete from tremolo.teacher_parent
where teacher_id = $1 and parent_id = $2;

-- name: DeleteParentChildRelationship :exec
delete from tremolo.parent_child
where parent_id = $1 and child_id = $2;

-- name: DeleteAllTeacherStudentsByTeacher :exec
delete from tremolo.teacher_student
where teacher_id = $1;

-- name: DeleteAllTeacherStudentsByStudent :exec
delete from tremolo.teacher_student
where student_id = $1;

-- name: DeleteAllTeacherParentsByTeacher :exec
delete from tremolo.teacher_parent
where teacher_id = $1;

-- name: DeleteAllTeacherParentsByParent :exec
delete from tremolo.teacher_parent
where parent_id = $1;

-- name: DeleteAllParentChildrenByParent :exec
delete from tremolo.parent_child
where parent_id = $1;

-- name: DeleteAllParentChildrenByChild :exec
delete from tremolo.parent_child
where child_id = $1;
