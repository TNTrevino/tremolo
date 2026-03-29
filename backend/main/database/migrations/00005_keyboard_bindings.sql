-- +goose Up
create table tremolo.keyboard_bindings (
    id serial primary key,
    user_id integer not null references tremolo.users(id) on delete cascade unique,
    key_c varchar(20) not null default 'a',
    key_d varchar(20) not null default 's',
    key_e varchar(20) not null default 'd',
    key_f varchar(20) not null default 'f',
    key_g varchar(20) not null default 'g',
    key_a varchar(20) not null default 'h',
    key_b varchar(20) not null default 'j',
    key_c_sharp varchar(20) not null default 'q',
    key_d_sharp varchar(20) not null default 'w',
    key_e_sharp varchar(20) not null default 'e',
    key_f_sharp varchar(20) not null default 'r',
    key_g_sharp varchar(20) not null default 't',
    key_a_sharp varchar(20) not null default 'y',
    key_b_sharp varchar(20) not null default 'u',
    key_c_flat varchar(20) not null default 'z',
    key_d_flat varchar(20) not null default 'x',
    key_e_flat varchar(20) not null default 'c',
    key_f_flat varchar(20) not null default 'v',
    key_g_flat varchar(20) not null default 'b',
    key_a_flat varchar(20) not null default 'n',
    key_b_flat varchar(20) not null default 'm'
);

-- +goose Down
drop table if exists tremolo.keyboard_bindings;
