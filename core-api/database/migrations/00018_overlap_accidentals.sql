-- +goose Up
alter table tremolo.keyboard_bindings
add column overlap_accidentals boolean not null default false;

-- +goose Down
alter table tremolo.keyboard_bindings
drop column if exists overlap_accidentals;
