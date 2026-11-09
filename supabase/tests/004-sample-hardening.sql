-- Образец защиты финансовой таблицы: строки не исчезают вместе с пользователем, очистка таблицы запрещена.
begin;
select plan(3);

select tests.create_supabase_user('frank');
insert into public.notes (owner_id, title) values (tests.get_supabase_uid('frank'), 'kept');

select throws_ok(
  $$ delete from auth.users where id = tests.get_supabase_uid('frank') $$,
  '23503',
  null,
  'пользователь с заметками не удаляется: on delete restrict'
);

select throws_ok(
  $$ truncate public.notes $$,
  '42501',
  null,
  'truncate запрещён триггером audit.forbid_truncate'
);

select is(
  (select count(*) from public.notes where owner_id = tests.get_supabase_uid('frank')),
  1::bigint,
  'строка на месте после обеих попыток'
);

select * from finish();
rollback;
