-- Политики таблицы notes: владелец видит и меняет своё, чужое невидимо и неизменяемо, аноним не видит ничего.
-- Проверка самого теста: временно замените using на (true) в миграции — тест «other user sees nothing» должен упасть.
begin;
select plan(12);

select tests.create_supabase_user('alice');
select tests.create_supabase_user('bob');

insert into public.notes (owner_id, title)
values (tests.get_supabase_uid('alice'), 'alice note');

select tests.authenticate_as('alice');
select is((select count(*)::int from public.notes), 1, 'owner sees own note');
select lives_ok(
  $$ insert into public.notes (owner_id, title) values (tests.get_supabase_uid('alice'), 'second') $$,
  'owner can insert own note'
);

select tests.authenticate_as('bob');
select is_empty('select * from public.notes', 'other user sees nothing');
select throws_ok(
  $$ insert into public.notes (owner_id, title) values (tests.get_supabase_uid('alice'), 'forged') $$,
  '42501',
  'new row violates row-level security policy for table "notes"',
  'other user cannot insert as owner'
);
select lives_ok($$ update public.notes set title = 'hijacked' $$, 'other user update runs');
select lives_ok($$ delete from public.notes $$, 'other user delete runs');

select tests.authenticate_as('alice');
select is(
  (select count(*)::int from public.notes where title <> 'hijacked'),
  2,
  'other user can neither change nor delete the owner''s notes'
);
select throws_ok(
  $$ update public.notes set owner_id = tests.get_supabase_uid('bob') where title = 'second' $$,
  '42501',
  'new row violates row-level security policy for table "notes"',
  'owner cannot hand a note to another user'
);
select lives_ok($$ update public.notes set title = 'renamed' where title = 'second' $$, 'owner can update own note');
select lives_ok($$ delete from public.notes where title = 'renamed' $$, 'owner can delete own note');

select tests.clear_authentication();
select is_empty('select * from public.notes', 'anonymous user sees nothing');
select throws_ok(
  $$ insert into public.notes (owner_id, title) values (gen_random_uuid(), 'anonymous') $$,
  '42501',
  null,
  'anonymous user cannot insert'
);

select * from finish();
rollback;
