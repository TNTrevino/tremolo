-- name: GetColorSchemesByUserID :many
select *
from tremolo.color_schemes
where user_id = $1
order by is_preset desc, name asc;

-- name: GetColorSchemeByID :one
select *
from tremolo.color_schemes
where id = $1 and user_id = $2;

-- name: CreateColorScheme :one
insert into tremolo.color_schemes (
    user_id, name, is_preset, is_dark,
    background, foreground,
    card, card_foreground,
    popover, popover_foreground,
    primary_color, primary_foreground,
    secondary_color, secondary_foreground,
    muted, muted_foreground,
    accent, accent_foreground,
    destructive, destructive_foreground,
    border_color, input_color, ring
)
values (
    $1, $2, $3, $4,
    $5, $6,
    $7, $8,
    $9, $10,
    $11, $12,
    $13, $14,
    $15, $16,
    $17, $18,
    $19, $20,
    $21, $22, $23
)
returning *;

-- name: UpdateColorScheme :one
update tremolo.color_schemes
set
    name = $3,
    is_dark = $4,
    background = $5,
    foreground = $6,
    card = $7,
    card_foreground = $8,
    popover = $9,
    popover_foreground = $10,
    primary_color = $11,
    primary_foreground = $12,
    secondary_color = $13,
    secondary_foreground = $14,
    muted = $15,
    muted_foreground = $16,
    accent = $17,
    accent_foreground = $18,
    destructive = $19,
    destructive_foreground = $20,
    border_color = $21,
    input_color = $22,
    ring = $23
where id = $1 and user_id = $2
returning *;

-- name: DeleteColorScheme :exec
delete from tremolo.color_schemes
where id = $1 and user_id = $2;

-- name: GetActiveColorScheme :one
select cs.*
from tremolo.color_schemes cs
join tremolo.users u on u.active_color_scheme_id = cs.id
where u.id = $1;

-- name: SetActiveColorScheme :exec
update tremolo.users
set active_color_scheme_id = $2
where id = $1;

-- name: SetPreferredSchemes :exec
update tremolo.users
set preferred_light_scheme_id = $2,
    preferred_dark_scheme_id = $3
where id = $1;

-- name: GetPreferredSchemeIDs :one
select active_color_scheme_id, preferred_light_scheme_id, preferred_dark_scheme_id
from tremolo.users
where id = $1;
