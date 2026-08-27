-- Teacher invite codes. Redemption is deliberately a single conditional
-- UPDATE rather than a select-then-update: see 00011_teacher_invite_codes.sql.

-- name: CreateTeacherInviteCode :one
insert into tremolo.teacher_invite_codes (code, note, max_uses, expires_at, created_by)
values ($1, $2, $3, $4, $5)
returning *;

-- name: RedeemTeacherInviteCode :one
update tremolo.teacher_invite_codes
set use_count = use_count + 1
where code = $1
  and use_count < max_uses
  and (expires_at is null or expires_at > now())
returning id;

-- name: ReleaseTeacherInviteCode :exec
update tremolo.teacher_invite_codes
set use_count = use_count - 1
where id = $1 and use_count > 0;

-- name: ListTeacherInviteCodes :many
select * from tremolo.teacher_invite_codes order by created_at desc;

-- name: GetTeacherInviteCodeByCode :one
select * from tremolo.teacher_invite_codes where code = $1;

-- name: DeleteTeacherInviteCode :exec
delete from tremolo.teacher_invite_codes where id = $1;
