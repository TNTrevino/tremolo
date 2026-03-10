-- +goose Up
create table tremolo.note_game_settings (
    id serial primary key,
    user_id integer not null references tremolo.users(id) on delete cascade unique,
    game_mode varchar(10) not null default 'time',
    time_limit integer not null default 30,
    note_limit integer not null default 25,
    scale varchar(50) not null default 'C Major',
    octave integer not null default 4
);

-- +goose Down
drop table if exists tremolo.note_game_settings;
