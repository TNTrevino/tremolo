-- name: CreateFriendship :exec
insert into tremolo.friends (user_id, friend_id)
values (@user_id, @friend_id);

-- name: GetFriendsByUserID :many
-- Returns users who have a mutual follow relationship with the given user
-- (both directions exist in the friends table = they are friends)
select
    u.id,
    u.first_name,
    u.last_name,
    r.name as role,
    u.instrument,
    coalesce(s.title, '') as school
from tremolo.friends f1
inner join tremolo.friends f2
    on
        f1.user_id = f2.friend_id
        and f1.friend_id = f2.user_id
inner join tremolo.users u
    on u.id = f1.friend_id
inner join tremolo.roles r
    on u.role_id = r.id
left join tremolo.schools s
    on u.school_id = s.id
where f1.user_id =
@user_id;
