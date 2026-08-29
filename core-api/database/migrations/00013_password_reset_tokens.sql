-- Password reset tokens (#248).
-- Only the sha256 hash is stored. A 32-byte crypto/rand token already has
-- full entropy, so a slow hash buys nothing against guessing it -- and a
-- bcrypt hash could not be indexed, which would turn every reset into a scan
-- comparing each unused row. Single use and expiry are enforced by the
-- ConsumePasswordResetToken UPDATE, not by a read-then-write.
-- +goose Up
create table tremolo.password_reset_tokens (
    id bigserial primary key,
    user_id int not null references tremolo.users (id) on delete cascade,
    token_hash varchar(64) not null unique,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
);
create index idx_password_reset_tokens_user on tremolo.password_reset_tokens (user_id) where used_at is null;
-- +goose Down
drop table if exists tremolo.password_reset_tokens;
