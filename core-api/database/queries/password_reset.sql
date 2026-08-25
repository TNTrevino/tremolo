-- name: CreatePasswordResetToken :one
insert into tremolo.password_reset_tokens (
    user_id,
    token_hash,
    expires_at
)
values ($1, $2, $3)
returning *;

-- ConsumePasswordResetToken is the single-use gate: claimed and returned in
-- one UPDATE statement, so two concurrent resets racing on the same token
-- cannot both win. sql.ErrNoRows means exactly "unknown, used, or expired"
-- -- there is no way to tell which from this query, and that is
-- deliberate (see services.ErrResetTokenInvalid).
--
-- name: ConsumePasswordResetToken :one
update tremolo.password_reset_tokens
set used_at = now()
where token_hash = @token_hash and used_at is null and expires_at > now()
returning *;

-- name: InvalidateUserPasswordResetTokens :exec
update tremolo.password_reset_tokens
set used_at = now()
where user_id = @user_id and used_at is null;

-- UpdateUserPassword lives here, not users.sql, so this feature's
-- migration and queries stay in their own file rather than touching one a
-- parallel branch may also be editing.
--
-- name: UpdateUserPassword :exec
update tremolo.users
set password = @password
where id = @id;

-- name: ListPasswordResetTokensByUser :many
select *
from tremolo.password_reset_tokens
where user_id = $1
order by created_at desc;
