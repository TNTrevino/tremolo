-- +goose Up
alter table tremolo.note_game_settings
add column low_note varchar(4) not null default 'C4',
add column high_note varchar(4) not null default 'C6',
add column clef varchar(10) not null default 'treble';

-- +goose Down
alter table tremolo.note_game_settings
drop column if exists low_note,
drop column if exists high_note,
drop column if exists clef;
