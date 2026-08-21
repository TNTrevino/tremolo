-- Per-game settings stored as JSONB, one row per (user, game type).
-- Used by the key signature / scale / chord identification games; the
-- note game keeps its dedicated note_game_settings table.

-- name: GetGameSettings :one
select *
from tremolo.game_settings
where user_id = $1
  and game_type = $2;

-- name: UpsertGameSettings :one
insert into tremolo.game_settings (
    user_id,
    game_type,
    config
)
values ($1, $2, $3)
on conflict (user_id, game_type) do update set
    config = EXCLUDED.config
returning *;

-- name: DeleteGameSettings :exec
delete from tremolo.game_settings
where user_id = $1
  and game_type = $2;
