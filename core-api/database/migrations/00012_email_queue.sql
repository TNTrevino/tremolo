-- The outbound email queue.
--
-- Shape:
--   queued_emails        one row per message, FULLY RENDERED. The row
--                        carries final body_html and body_text, not
--                        template input, because rendering happens at
--                        enqueue: a later template edit can never
--                        silently rewrite a mail that is already waiting,
--                        and the watcher never has to load templates.
--   email_send_attempts  one row per delivery attempt. queued_emails
--                        answers "what is the state of this message";
--                        this table answers "how hard did we try, and
--                        what did the relay say each time" -- the
--                        question a support ticket actually asks, and
--                        one a single last_error column cannot.
--
-- message_id is minted once, at enqueue, and reused on every retry so a
-- relay that already accepted the mail can recognise the redelivery. The
-- UNIQUE constraint on it is deliberate: it makes a double enqueue of the
-- same message a loud insert failure rather than two mails in someone's
-- inbox.
--
-- Note the numbering gap. 00011 is claimed by a parallel branch
-- (teacher invite codes); goose treats duplicate version prefixes as a
-- hard failure and gaps as fine, so this file takes 00012.

-- +goose Up
create table tremolo.queued_emails (
    id bigserial primary key,
    recipient varchar(255) not null,
    recipient_name varchar(255) not null default '',
    subject varchar(255) not null,
    template varchar(64) not null,
    body_html text not null,
    body_text text not null,
    message_id varchar(255) not null unique,
    status varchar(16) not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'dead')),
    attempts int not null default 0,
    max_attempts int not null default 5,
    next_attempt_at timestamptz,
    claimed_at timestamptz,
    sent_at timestamptz,
    last_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- The watcher's claim query only ever looks at rows that are still in
-- play, so the index is partial: sent and dead rows accumulate forever
-- and none of them belong in it.
create index idx_queued_emails_claimable
on tremolo.queued_emails (next_attempt_at, created_at)
where status in ('pending', 'sending');

create index idx_queued_emails_recipient
on tremolo.queued_emails (recipient, created_at desc);

create table tremolo.email_send_attempts (
    id bigserial primary key,
    queued_email_id bigint not null
    references tremolo.queued_emails (id) on delete cascade,
    attempt_number int not null,
    succeeded boolean not null default false,
    error text,
    attempted_at timestamptz not null default now()
);

create index idx_email_send_attempts_email
on tremolo.email_send_attempts (queued_email_id, attempted_at desc);

-- +goose Down
drop table if exists tremolo.email_send_attempts;
drop table if exists tremolo.queued_emails;
