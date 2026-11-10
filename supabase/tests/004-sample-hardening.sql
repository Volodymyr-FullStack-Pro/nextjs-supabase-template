-- Образец защиты финансовой таблицы: строки не исчезают вместе с пользователем, очистка таблицы запрещена,
-- служебные колонки (id, владелец, время создания) клиент не задаёт и не меняет.
-- Проверка самого теста: верните табличный grant insert, update — проверки служебных колонок должны упасть.
begin;
select plan(11);

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

-- Служебные колонки клиент не задаёт и не меняет: права роли API выданы по колонкам, а не на таблицу целиком.
select tests.authenticate_as('frank');
select throws_ok(
  $$ insert into public.notes (owner_id, title, created_at)
     values (tests.get_supabase_uid('frank'), 'задним числом', '2020-01-01') $$,
  '42501',
  'permission denied for table notes',
  'клиент не задаёт created_at при вставке'
);
select throws_ok(
  $$ insert into public.notes (id, owner_id, title)
     values (gen_random_uuid(), tests.get_supabase_uid('frank'), 'свой id') $$,
  '42501',
  'permission denied for table notes',
  'клиент не задаёт id при вставке'
);
select throws_ok(
  $$ update public.notes set created_at = '2020-01-01' $$,
  '42501',
  'permission denied for table notes',
  'клиент не меняет created_at'
);
select throws_ok(
  $$ update public.notes set id = gen_random_uuid() $$,
  '42501',
  'permission denied for table notes',
  'клиент не меняет id'
);
select throws_ok(
  $$ update public.notes set owner_id = owner_id $$,
  '42501',
  'permission denied for table notes',
  'клиент не меняет owner_id'
);
select lives_ok(
  $$ update public.notes set title = 'kept, renamed', amount = '10.50' $$,
  'заголовок и сумму владелец меняет'
);

select tests.clear_authentication();
select results_eq(
  $$ select title, amount::text from public.notes where owner_id = tests.get_supabase_uid('frank') $$,
  $$ values ('kept, renamed', '10.50') $$,
  'правка разрешённых колонок дошла до строки'
);
select throws_ok(
  $$ update public.notes set id = gen_random_uuid() where owner_id = tests.get_supabase_uid('frank') $$,
  '42501',
  'смена id в notes запрещена: по id запись связана со своей историей в журнале',
  'владелец базы тоже не меняет id: отклоняет триггер журнала'
);

select * from finish();
rollback;
