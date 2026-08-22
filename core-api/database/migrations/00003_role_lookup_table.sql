-- +goose Up

create table tremolo.roles (
    id serial primary key,
    name varchar(50) unique not null
);

insert into tremolo.roles (name) values
    ('STUDENT'),
    ('TEACHER'),
    ('PARENT'),
    ('ADMIN');

update tremolo.users set role = upper(role) where role is not null;

alter table tremolo.users add column role_id int references tremolo.roles(id);

update tremolo.users u
set role_id = r.id
from tremolo.roles r
where u.role = r.name;

update tremolo.users
set role_id = (select id from tremolo.roles where name = 'STUDENT')
where role_id is null;

alter table tremolo.users alter column role_id set not null;

alter table tremolo.users drop column role;

-- +goose Down

alter table tremolo.users add column role varchar(255);

update tremolo.users u
set role = r.name
from tremolo.roles r
where u.role_id = r.id;

alter table tremolo.users drop column role_id;

drop table if exists tremolo.roles;
