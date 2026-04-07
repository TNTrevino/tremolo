-- +goose Up
create table tremolo.color_schemes (
    id serial primary key,
    user_id integer not null references tremolo.users(id) on delete cascade,
    name varchar(100) not null,
    is_preset boolean not null default false,
    is_dark boolean not null default false,
    background varchar(30) not null,
    foreground varchar(30) not null,
    card varchar(30) not null,
    card_foreground varchar(30) not null,
    popover varchar(30) not null,
    popover_foreground varchar(30) not null,
    primary_color varchar(30) not null,
    primary_foreground varchar(30) not null,
    secondary_color varchar(30) not null,
    secondary_foreground varchar(30) not null,
    muted varchar(30) not null,
    muted_foreground varchar(30) not null,
    accent varchar(30) not null,
    accent_foreground varchar(30) not null,
    destructive varchar(30) not null,
    destructive_foreground varchar(30) not null,
    border_color varchar(30) not null,
    input_color varchar(30) not null,
    ring varchar(30) not null,
    unique(user_id, name)
);

alter table tremolo.users
    add column active_color_scheme_id integer references tremolo.color_schemes(id) on delete set null,
    add column preferred_light_scheme_id integer references tremolo.color_schemes(id) on delete set null,
    add column preferred_dark_scheme_id integer references tremolo.color_schemes(id) on delete set null;

-- Seed Default Light for all existing users
insert into tremolo.color_schemes (
    user_id, name, is_preset, is_dark,
    background, foreground, card, card_foreground, popover, popover_foreground,
    primary_color, primary_foreground, secondary_color, secondary_foreground,
    muted, muted_foreground, accent, accent_foreground,
    destructive, destructive_foreground, border_color, input_color, ring
)
select
    id, 'Default Light', true, false,
    '0 0% 100%', '240 10% 3.9%', '0 0% 100%', '240 10% 3.9%', '0 0% 100%', '240 10% 3.9%',
    '262 83% 58%', '0 0% 98%', '240 4.8% 95.9%', '240 5.9% 10%',
    '240 4.8% 95.9%', '240 3.8% 46.1%', '45 93% 47%', '240 5.9% 10%',
    '0 84.2% 60.2%', '0 0% 98%', '240 5.9% 90%', '240 5.9% 90%', '262 83% 58%'
from tremolo.users;

-- Seed Default Dark for all existing users
insert into tremolo.color_schemes (
    user_id, name, is_preset, is_dark,
    background, foreground, card, card_foreground, popover, popover_foreground,
    primary_color, primary_foreground, secondary_color, secondary_foreground,
    muted, muted_foreground, accent, accent_foreground,
    destructive, destructive_foreground, border_color, input_color, ring
)
select
    id, 'Default Dark', true, true,
    '240 10% 3.9%', '0 0% 98%', '240 10% 8%', '0 0% 98%', '240 10% 8%', '0 0% 98%',
    '262 83% 58%', '0 0% 98%', '240 3.7% 15.9%', '0 0% 98%',
    '240 3.7% 15.9%', '240 5% 64.9%', '45 93% 47%', '0 0% 98%',
    '0 62.8% 30.6%', '0 0% 98%', '240 3.7% 15.9%', '240 3.7% 15.9%', '262 83% 58%'
from tremolo.users;

-- Set Default Dark as active and configure preferred schemes for existing users
update tremolo.users u set
    active_color_scheme_id = (select id from tremolo.color_schemes cs where cs.user_id = u.id and cs.name = 'Default Dark'),
    preferred_light_scheme_id = (select id from tremolo.color_schemes cs where cs.user_id = u.id and cs.name = 'Default Light'),
    preferred_dark_scheme_id = (select id from tremolo.color_schemes cs where cs.user_id = u.id and cs.name = 'Default Dark');

-- +goose Down
alter table tremolo.users
    drop column if exists active_color_scheme_id,
    drop column if exists preferred_light_scheme_id,
    drop column if exists preferred_dark_scheme_id;
drop table if exists tremolo.color_schemes;
