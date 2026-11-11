-- Поведение таблицы __module_name__: владелец видит и меняет своё, чужое невидимо и неизменяемо, у анонима нет прав;
-- повтор с тем же client_request_id не создаёт вторую строку; ограничения сущности; таблица под журналом и вторым
-- фактором. Соглашения (RLS включён, политика второго фактора, триггеры, права по колонкам, индексы, NaN, валюта
-- рядом с суммой) у каждой таблицы проверяет по каталогу 900-table-conventions.sql — здесь их не повторять.
-- Проверка самого теста: временно замените using на (true) в политике select — «other user sees nothing» должен упасть.
begin;
select plan(23);

select tests.create_supabase_user('alice');
select tests.create_supabase_user('bob');

insert into public.__module_name__ (owner_id, title, amount, currency, client_request_id)
values (tests.get_supabase_uid('alice'), 'alice row', '10.50', 'EUR', gen_random_uuid());

-- Политики владельца.
select tests.authenticate_as('alice');
select is((select count(*)::int from public.__module_name__), 1, 'owner sees own row');
select lives_ok(
  $$ insert into public.__module_name__ (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('alice'), 'second', '1', 'EUR', gen_random_uuid()) $$,
  'owner can insert own row'
);

select tests.authenticate_as('bob');
select is_empty('select * from public.__module_name__', 'other user sees nothing');
select throws_ok(
  $$ insert into public.__module_name__ (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('alice'), 'forged', '1', 'EUR', gen_random_uuid()) $$,
  '42501',
  'new row violates row-level security policy for table "__module_name__"',
  'other user cannot insert as owner'
);
select lives_ok($$ update public.__module_name__ set title = 'hijacked' $$, 'other user update runs');
select lives_ok($$ delete from public.__module_name__ $$, 'other user delete runs');

select tests.authenticate_as('alice');
select is(
  (select count(*)::int from public.__module_name__ where title <> 'hijacked'),
  2,
  'other user can neither change nor delete the owner''s rows'
);
select throws_ok(
  $$ update public.__module_name__ set owner_id = tests.get_supabase_uid('bob') where title = 'second' $$,
  '42501',
  'permission denied for table __module_name__',
  'owner cannot hand a row to another user: no privilege on the owner_id column'
);
-- Вторая линия: даже если право на колонку когда-нибудь выдадут, строку не даст передать политика update.
select tests.clear_authentication();
grant update (owner_id) on public.__module_name__ to authenticated;
select tests.authenticate_as('alice');
select throws_ok(
  $$ update public.__module_name__ set owner_id = tests.get_supabase_uid('bob') where title = 'second' $$,
  '42501',
  'new row violates row-level security policy for table "__module_name__"',
  'owner cannot hand a row to another user even with the column privilege'
);
select tests.clear_authentication();
revoke update (owner_id) on public.__module_name__ from authenticated;
select tests.authenticate_as('alice');
select lives_ok(
  $$ update public.__module_name__ set title = 'renamed' where title = 'second' $$,
  'owner can update own row'
);
select lives_ok($$ delete from public.__module_name__ where title = 'renamed' $$, 'owner can delete own row');

-- Ключ повтора: один client_request_id у одного владельца — одна строка.
select lives_ok(
  $$ insert into public.__module_name__ (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('alice'), 'first submit', '1', 'EUR', '00000000-0000-4000-8000-000000000001') $$,
  'first submit creates a row'
);
select throws_ok(
  $$ insert into public.__module_name__ (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('alice'), 'repeat', '1', 'EUR', '00000000-0000-4000-8000-000000000001') $$,
  '23505',
  'duplicate key value violates unique constraint "__module_name___owner_id_client_request_id_key"',
  'repeat with the same client_request_id is refused: by this code and constraint the repository returns the saved row'
);
select tests.authenticate_as('bob');
select lives_ok(
  $$ insert into public.__module_name__ (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('bob'), 'foreign key', '1', 'EUR', '00000000-0000-4000-8000-000000000001') $$,
  'the same key of another owner neither collides nor reveals the foreign row'
);

-- Ограничения сущности.
select tests.authenticate_as('alice');
select throws_ok(
  $$ insert into public.__module_name__ (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('alice'), 'lower case', '1', 'eur', gen_random_uuid()) $$,
  '23514',
  null,
  'currency is three capital letters'
);
select throws_ok(
  $$ insert into public.__module_name__ (owner_id, title, amount, currency, client_request_id)
     values (tests.get_supabase_uid('alice'), repeat('x', 201), '1', 'EUR', gen_random_uuid()) $$,
  '23514',
  null,
  'title is not longer than 200 characters'
);
select throws_ok(
  $$ insert into public.__module_name__ (owner_id, title, currency, client_request_id)
     values (tests.get_supabase_uid('alice'), 'no amount', 'EUR', gen_random_uuid()) $$,
  '23502',
  null,
  'amount has no default value'
);
insert into public.__module_name__ (owner_id, title, amount, currency, client_request_id)
values (tests.get_supabase_uid('alice'), 'exact', '1234567890123456.78', 'CHF', gen_random_uuid());
select is(
  (select amount::text from public.__module_name__ where title = 'exact'),
  '1234567890123456.78',
  '16 significant digits are stored and read as text without loss'
);

-- Журнал и второй фактор: поведение проверяют 003 и 002 на своих таблицах, здесь — что таблица под ними.
select tests.clear_authentication();
select results_eq(
  $$ select distinct actor from audit.log
     where table_name = '__module_name__' and op = 'UPDATE' and new ->> 'title' = 'renamed' $$,
  $$ values (tests.get_supabase_uid('alice')) $$,
  'the update is written to the audit log with its author'
);
select tests.add_verified_totp('alice');
select tests.authenticate_as('alice', 'aal1');
select is_empty(
  'select * from public.__module_name__',
  'with a verified factor the aal1 session sees no rows'
);
select tests.authenticate_as('alice', 'aal2');
select isnt_empty('select * from public.__module_name__', 'the aal2 session sees the rows');

select tests.clear_authentication();
set local role anon; -- clear_authentication возвращает к роли postgres, а она обходит RLS
select throws_ok(
  'select * from public.__module_name__',
  '42501',
  'permission denied for table __module_name__',
  'anonymous user cannot read'
);
select throws_ok(
  $$ insert into public.__module_name__ (owner_id, title, amount, currency, client_request_id)
     values (gen_random_uuid(), 'anonymous', '1', 'EUR', gen_random_uuid()) $$,
  '42501',
  'permission denied for table __module_name__',
  'anonymous user cannot insert'
);

select * from finish();
rollback;
