-- Политики таблицы notes: владелец видит и меняет своё, чужое невидимо.
-- Проверка самого теста: временно замените using на (true) в миграции — тест «other user sees nothing» должен упасть.
begin;
select plan(4);

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

select * from finish();
rollback;
