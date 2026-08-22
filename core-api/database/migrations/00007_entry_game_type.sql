-- +goose Up
alter table tremolo.note_game_entries
add column game_type varchar(30) not null default 'note';

create index idx_note_game_entries_user_game_type
on tremolo.note_game_entries (user_id, game_type);

-- +goose Down
drop index if exists tremolo.idx_note_game_entries_user_game_type;
alter table tremolo.note_game_entries drop column if exists game_type;
