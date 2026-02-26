-- +goose Up
create table tremolo.friends (
user_id int not null references tremolo.users (id),
friend_id int not null references tremolo.users (id),
created_date date default current_date,
created_time time default current_time,
primary key (user_id, friend_id),
check (user_id < > friend_id)
) ;

alter table tremolo.users add column instrument varchar (255) ;

-- +goose Down
drop table if exists tremolo.friends ;
alter table tremolo.users drop column if exists instrument ;
