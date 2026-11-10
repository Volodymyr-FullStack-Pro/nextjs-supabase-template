-- Второй фактор: с подтверждённым TOTP данные видны и меняются только в сессии aal2; без фактора — как раньше.
-- Проверка самого теста: временно замените тело private.mfa_ok() на true — тесты «aal1 with factor» должны упасть.
begin;
select plan(11);

select tests.create_supabase_user('carol');
select tests.create_supabase_user('dave');
select tests.add_verified_totp('carol');

insert into public.notes (owner_id, title, currency, client_request_id)
values (tests.get_supabase_uid('carol'), 'carol note', 'EUR', gen_random_uuid()), (tests.get_supabase_uid('dave'), 'dave note', 'EUR', gen_random_uuid());

select tests.authenticate_as('carol', 'aal1');
select is_empty('select * from public.notes', 'aal1 with factor: sees nothing');
select throws_ok(
  $$ insert into public.notes (owner_id, title, currency, client_request_id) values (tests.get_supabase_uid('carol'), 'aal1 insert', 'EUR', gen_random_uuid()) $$,
  '42501',
  'new row violates row-level security policy "notes: second factor when enrolled" for table "notes"',
  'aal1 with factor: cannot insert'
);
select lives_ok($$ update public.notes set title = 'aal1 update' $$, 'aal1 with factor: update runs');
select lives_ok($$ delete from public.notes $$, 'aal1 with factor: delete runs');

select tests.authenticate_as('carol', 'aal2');
select results_eq(
  'select title from public.notes',
  array['carol note'],
  'aal2 with factor: sees own notes, untouched by the aal1 attempts'
);
select lives_ok(
  $$ insert into public.notes (owner_id, title, currency, client_request_id) values (tests.get_supabase_uid('carol'), 'aal2 insert', 'EUR', gen_random_uuid()) $$,
  'aal2 with factor: can insert'
);

select tests.authenticate_as('dave', 'aal1');
select results_eq('select title from public.notes', array['dave note'], 'no factor at aal1: sees own notes');
select lives_ok(
  $$ insert into public.notes (owner_id, title, currency, client_request_id) values (tests.get_supabase_uid('dave'), 'dave second', 'EUR', gen_random_uuid()) $$,
  'no factor at aal1: can insert'
);
select ok((select private.mfa_ok()), 'authenticated can call private.mfa_ok');

select tests.clear_authentication();
set local role anon;
select throws_ok(
  'select private.mfa_ok()',
  '42501',
  'permission denied for schema private',
  'anonymous user cannot call private.mfa_ok'
);

select tests.clear_authentication();
select is(
  (select array_agg(p.proname::text) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private' and has_function_privilege('authenticated', p.oid, 'execute')),
  array['mfa_ok'],
  'authenticated may execute only private.mfa_ok'
);

select * from finish();
rollback;
