-- Образец защиты финансовой таблицы: строки не исчезают вместе с пользователем, очистка таблицы запрещена,
-- служебные колонки (id, владелец, время создания) клиент не задаёт и не меняет, повторная отправка с тем же
-- client_request_id не создаёт вторую строку.
-- Проверка самого теста: верните табличный grant insert, update — проверки служебных колонок должны упасть.
begin;
select plan(16);

select tests.create_supabase_user('frank');
insert into public.notes (owner_id, title, currency, client_request_id) values (tests.get_supabase_uid('frank'), 'kept', 'EUR', gen_random_uuid());

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
  $$ insert into public.notes (owner_id, title, created_at, currency, client_request_id)
     values (tests.get_supabase_uid('frank'), 'задним числом', '2020-01-01', 'EUR', gen_random_uuid()) $$,
  '42501',
  'permission denied for table notes',
  'клиент не задаёт created_at при вставке'
);
select throws_ok(
  $$ insert into public.notes (id, owner_id, title, currency, client_request_id)
     values (gen_random_uuid(), tests.get_supabase_uid('frank'), 'свой id', 'EUR', gen_random_uuid()) $$,
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

-- Идемпотентность: один client_request_id у одного владельца — одна строка.
select tests.create_supabase_user('gina');
select tests.authenticate_as('frank');
select lives_ok(
  $$ insert into public.notes (owner_id, title, currency, client_request_id)
     values (tests.get_supabase_uid('frank'), 'первая отправка', 'EUR', '00000000-0000-4000-8000-000000000001') $$,
  'первая отправка формы создаёт строку'
);
select throws_ok(
  $$ insert into public.notes (owner_id, title, currency, client_request_id)
     values (tests.get_supabase_uid('frank'), 'повтор', 'EUR', '00000000-0000-4000-8000-000000000001') $$,
  '23505',
  'duplicate key value violates unique constraint "notes_owner_id_client_request_id_key"',
  'повтор с тем же client_request_id отклонён: репозиторий по этому коду возвращает уже созданную строку'
);
select throws_ok(
  $$ update public.notes set client_request_id = gen_random_uuid() $$,
  '42501',
  'permission denied for table notes',
  'клиент не меняет client_request_id'
);
select throws_ok(
  $$ insert into public.notes (owner_id, title, currency)
     values (tests.get_supabase_uid('frank'), 'без ключа', 'EUR') $$,
  '23502',
  null,
  'вставка без client_request_id отклонена'
);
select tests.authenticate_as('gina');
select lives_ok(
  $$ insert into public.notes (owner_id, title, currency, client_request_id)
     values (tests.get_supabase_uid('gina'), 'чужой ключ', 'EUR', '00000000-0000-4000-8000-000000000001') $$,
  'тот же ключ у другого владельца не мешает и не выдаёт чужую строку'
);
select tests.clear_authentication();

select * from finish();
rollback;
