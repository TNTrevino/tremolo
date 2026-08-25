-- name: CreateEmailToken :one
insert into tremolo.email_tokens (
    user_id,
    purpose,
    token_hash,
    email,
    expires_at
)
values (@user_id, @purpose, @token_hash, @email, @expires_at)
returning *;

-- ConsumeEmailToken is the same single-statement gate as
-- ConsumePasswordResetToken: claimed and returned in one UPDATE, so two
-- concurrent redemptions racing on the same token cannot both win.
-- purpose is part of the WHERE, not just token_hash, because email_tokens
-- is shared with the email-change flow (#249) -- a verify_email token must
-- never be consumable as a change_email token, even though token_hash
-- alone is already globally unique. Returns the full row (not just
-- user_id) because the email-change flow needs .Email too.
--
-- name: ConsumeEmailToken :one
update tremolo.email_tokens
set used_at = now()
where token_hash = @token_hash and purpose = @purpose and used_at is null and expires_at > now()
returning *;

-- name: InvalidateEmailTokens :exec
update tremolo.email_tokens
set used_at = now()
where user_id = @user_id and purpose = @purpose and used_at is null;

-- MarkEmailVerified is coalesce-guarded so redeeming a second valid token
-- (a stale second tab, a resend race) is idempotent: the timestamp is set
-- once, on the first success, and never moves after that.
--
-- name: MarkEmailVerified :exec
update tremolo.users
set email_verified_at = coalesce(email_verified_at, now())
where id = @id;

-- name: ListEmailTokensByUser :many
select *
from tremolo.email_tokens
where user_id = @user_id and purpose = @purpose
order by created_at desc;
