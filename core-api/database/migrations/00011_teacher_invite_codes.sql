-- Teacher invite codes (epic #238 / #250).
-- Self-service signup grants TEACHER only when the request carries a code
-- that exists, has not expired, and has uses left. Codes are minted by an
-- ADMIN (POST /api/admin/teacher-invites) or by hand in SQL during the
-- pilot -- see core-api/README.md, "Teacher invite codes".
-- Redemption is a single conditional UPDATE (RedeemTeacherInviteCode), so
-- two people racing the last use of a code cannot both win.
-- No used_by column and no uses table: with max_uses > 1 a scalar used_by
-- is a lie, and a 20-teacher pilot answers "who redeemed" from the users
-- table. teacher_invite_code_uses would be a purely additive follow-up.

-- +goose Up
create table tremolo.teacher_invite_codes (
    id serial primary key,
    code varchar(16) not null unique check (code = upper(code)),
    note varchar(255) not null default '',
    max_uses int not null default 1 check (max_uses > 0),
    use_count int not null default 0 check (use_count >= 0),
    expires_at timestamptz,
    created_by int references tremolo.users (id) on delete set null,
    created_at timestamptz not null default now(),
    check (use_count <= max_uses)
);

-- +goose Down
drop table if exists tremolo.teacher_invite_codes;
