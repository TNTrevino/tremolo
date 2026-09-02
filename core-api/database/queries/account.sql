-- Queries for #249's change-password and change-email flows.

-- GetUserByID does not select the password hash, and account changes need
-- it. A dedicated query keeps users.sql untouched.
--
-- name: GetUserCredentials :one
select u.id, u.email, coalesce(u.password, '') as password, u.google_id, u.first_name
from tremolo.users u where u.id = @id;

-- UpdateUserEmail is the atomic swap: the address and its verified stamp
-- move in one statement. email_verified_at is set here, not left to a
-- later MarkEmailVerified call, because the confirmation link itself is
-- what proved control of the new address -- the same proof a verify_email
-- token gives, so the same trust follows it.
--
-- name: UpdateUserEmail :exec
update tremolo.users set email = @email, email_verified_at = now() where id = @id;

-- CountUsersByEmail backs RequestEmailChange's already-taken check. This
-- is a genuine account-enumeration surface -- unlike Register's
-- checkIfUserExists, whose caller has proven nothing yet -- but here the
-- caller is already authenticated AND has just re-proved their current
-- password, a different threat model where confirming another user's
-- address collides on that call is an accepted cost (see
-- services.RequestEmailChange).
--
-- name: CountUsersByEmail :one
select count(*)::int from tremolo.users where email = @email;
