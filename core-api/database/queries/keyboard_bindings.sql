-- name: GetKeyboardBindings :one
select *
from tremolo.keyboard_bindings
where user_id = $1;

-- name: UpsertKeyboardBindings :one
insert into tremolo.keyboard_bindings (
    user_id,
    key_c, key_d, key_e, key_f, key_g, key_a, key_b,
    key_c_sharp, key_d_sharp, key_e_sharp, key_f_sharp, key_g_sharp, key_a_sharp, key_b_sharp,
    key_c_flat, key_d_flat, key_e_flat, key_f_flat, key_g_flat, key_a_flat, key_b_flat,
    overlap_accidentals
)
values (
    $1,
    $2, $3, $4, $5, $6, $7, $8,
    $9, $10, $11, $12, $13, $14, $15,
    $16, $17, $18, $19, $20, $21, $22,
    $23
)
on conflict (user_id) do update set
    key_c = EXCLUDED.key_c,
    key_d = EXCLUDED.key_d,
    key_e = EXCLUDED.key_e,
    key_f = EXCLUDED.key_f,
    key_g = EXCLUDED.key_g,
    key_a = EXCLUDED.key_a,
    key_b = EXCLUDED.key_b,
    key_c_sharp = EXCLUDED.key_c_sharp,
    key_d_sharp = EXCLUDED.key_d_sharp,
    key_e_sharp = EXCLUDED.key_e_sharp,
    key_f_sharp = EXCLUDED.key_f_sharp,
    key_g_sharp = EXCLUDED.key_g_sharp,
    key_a_sharp = EXCLUDED.key_a_sharp,
    key_b_sharp = EXCLUDED.key_b_sharp,
    key_c_flat = EXCLUDED.key_c_flat,
    key_d_flat = EXCLUDED.key_d_flat,
    key_e_flat = EXCLUDED.key_e_flat,
    key_f_flat = EXCLUDED.key_f_flat,
    key_g_flat = EXCLUDED.key_g_flat,
    key_a_flat = EXCLUDED.key_a_flat,
    key_b_flat = EXCLUDED.key_b_flat,
    overlap_accidentals = EXCLUDED.overlap_accidentals
returning *;

-- name: DeleteKeyboardBindings :exec
delete from tremolo.keyboard_bindings
where user_id = $1;
