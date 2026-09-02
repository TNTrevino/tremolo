-- +goose Up
create table tremolo.game_settings (
    id serial primary key,
    user_id integer not null references tremolo.users (id) on delete cascade,
    game_type varchar(30) not null,
    config jsonb not null default '{}'::jsonb,
    unique (user_id, game_type)
);

-- +goose Down
drop table if exists tremolo.game_settings;
