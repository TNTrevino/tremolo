-- Soft email verification (#108) and the shared token table (#108 + #249).
-- email_tokens is shared with the email-change flow -- the payload is
-- identical, and `email` means "the address this token proves control of"
-- (the current address for verify_email, the requested address for
-- change_email). The CHECK constraint lists both purposes now, so #249
-- needs no migration of its own.
-- +goose Up
alter table tremolo.users add column email_verified_at timestamptz;
-- Google-authenticated accounts already proved control of the address to
-- Google (google_auth_service.go rejects claims with email_verified false),
-- so backfill them rather than mailing every existing OAuth user a link.
update tremolo.users set email_verified_at = now() where google_id is not null and email_verified_at is null;
create table tremolo.email_tokens (
    id bigserial primary key,
    user_id int not null references tremolo.users (id) on delete cascade,
    purpose varchar(24) not null,
    token_hash varchar(64) not null unique,
    email varchar(255) not null,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now(),
    constraint email_tokens_purpose_check check (purpose in ('verify_email', 'change_email'))
);
create index idx_email_tokens_user on tremolo.email_tokens (user_id, purpose) where used_at is null;
-- +goose Down
drop table if exists tremolo.email_tokens;
alter table tremolo.users drop column if exists email_verified_at;
