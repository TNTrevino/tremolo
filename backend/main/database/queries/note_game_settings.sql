-- name: GetNoteGameSettings :one
select *
from tremolo.note_game_settings
where user_id = $1;

-- name: UpsertNoteGameSettings :one
insert into tremolo.note_game_settings (
    user_id,
    game_mode,
    time_limit,
    note_limit,
    scale,
    octave
)
values ($1, $2, $3, $4, $5, $6)
on conflict (user_id) do update set
    game_mode = EXCLUDED.game_mode,
    time_limit = EXCLUDED.time_limit,
    note_limit = EXCLUDED.note_limit,
    scale = EXCLUDED.scale,
    octave = EXCLUDED.octave
returning *;

-- name: DeleteNoteGameSettings :exec
delete from tremolo.note_game_settings
where user_id = $1;
