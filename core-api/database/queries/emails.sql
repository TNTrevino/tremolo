-- name: EnqueueEmail :one
insert into tremolo.queued_emails (
    recipient,
    recipient_name,
    subject,
    template,
    body_html,
    body_text,
    message_id,
    max_attempts
)
values ($1, $2, $3, $4, $5, $6, $7, $8)
returning *;

-- ClaimQueuedEmails takes ownership of a batch in one statement: select
-- and update together, so two watchers cannot hand the same message to
-- two relays. FOR UPDATE SKIP LOCKED is what makes the second watcher
-- move on to the next row instead of blocking on the first one's lock.
--
-- The second arm of the WHERE re-claims a stale 'sending' row: a watcher
-- that was killed mid-send leaves a row claimed forever otherwise, so a
-- claim older than the lease is treated as abandoned.
--
-- The parentheses in the WHERE clause are load-bearing. `A and B or C`
-- parses as `(A and B) or C`, which is what we want here -- but only by
-- accident of precedence, and the next person to add a condition would
-- have no way to tell that was intended. They stay explicit.
--
-- name: ClaimQueuedEmails :many
with claimable as (
    select id
    from tremolo.queued_emails
    where
        (
            status = 'pending'
            and (next_attempt_at is null or next_attempt_at <= now())
        )
        or (
            status = 'sending'
            and claimed_at
            < now() - (sqlc.arg(claim_lease_seconds)::int * interval '1 second')
        )
    order by created_at
    limit sqlc.arg(batch_size)::int
    for update skip locked
)

update tremolo.queued_emails q
set
    status = 'sending',
    claimed_at = now(),
    attempts = q.attempts + 1,
    updated_at = now()
from claimable c
where q.id = c.id
returning q.*;

-- name: MarkEmailSent :exec
update tremolo.queued_emails
set
    status = 'sent',
    sent_at = now(),
    claimed_at = null,
    last_error = null,
    updated_at = now()
where id = $1;

-- name: RescheduleEmail :exec
update tremolo.queued_emails
set
    status = 'pending',
    claimed_at = null,
    next_attempt_at
    = now() + (sqlc.arg(backoff_seconds)::int * interval '1 second'),
    last_error = sqlc.arg(last_error),
    updated_at = now()
where id = sqlc.arg(id);

-- name: MarkEmailDead :exec
update tremolo.queued_emails
set
    status = 'dead',
    claimed_at = null,
    last_error = sqlc.arg(last_error),
    updated_at = now()
where id = sqlc.arg(id);

-- name: RecordEmailSendAttempt :exec
insert into tremolo.email_send_attempts (
    queued_email_id,
    attempt_number,
    succeeded,
    error
)
values ($1, $2, $3, $4);

-- name: GetQueuedEmailByID :one
select *
from tremolo.queued_emails
where id = $1;

-- name: ListQueuedEmailsByRecipient :many
select *
from tremolo.queued_emails
where recipient = $1
order by created_at desc;

-- name: ListEmailSendAttempts :many
select *
from tremolo.email_send_attempts
where queued_email_id = $1
order by attempted_at;

-- name: DeleteQueuedEmailsByRecipient :exec
delete from tremolo.queued_emails
where recipient = $1;
