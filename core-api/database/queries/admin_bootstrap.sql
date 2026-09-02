-- name: PromoteUserToAdmin :one
-- Promotes a user to ADMIN by email, unless they already hold that role.
-- Matching zero rows is ambiguous by design (no such email vs. already
-- ADMIN) -- callers that need to tell those apart follow up with
-- GetUserRoleNameByEmail. See services.BootstrapAdmin.
update tremolo.users
set role_id = (select id from tremolo.roles where name = 'ADMIN')
where email = $1
  and role_id <> (select id from tremolo.roles where name = 'ADMIN')
returning id;

-- name: GetUserRoleNameByEmail :one
select r.name as role
from tremolo.users u
inner join tremolo.roles r on u.role_id = r.id
where u.email = $1;
