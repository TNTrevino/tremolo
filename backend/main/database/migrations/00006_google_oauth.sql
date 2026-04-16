-- +goose Up

insert into tremolo.roles (name) values ('BASIC');

alter table tremolo.users add column google_id varchar(255) unique null;

alter table tremolo.users alter column password drop not null;

-- +goose Down

update tremolo.users set password = '' where password is null;

alter table tremolo.users alter column password set not null;

alter table tremolo.users drop column google_id;

delete from tremolo.roles where name = 'BASIC';
