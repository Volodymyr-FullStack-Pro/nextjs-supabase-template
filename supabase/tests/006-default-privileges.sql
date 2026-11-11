-- Права по умолчанию: новая таблица, её счётчик и новая функция в public закрыты для anon и authenticated,
-- пока миграция сама не выдаст grant; функцию для rpc открывает только явный grant, и только вошедшему.
-- Проверка самого теста: без миграции *_functions_closed_by_default.sql (supabase db reset без неё) падают
-- проверки функции — аноним её вызывает.
begin;
select plan(8);

create table public.default_privileges_probe (id bigint generated always as identity primary key);
create function public.default_privileges_probe()
returns integer
language sql
security definer
set search_path = ''
as 'select 1';

select is_empty(
  $$ select role || ': ' || privilege
     from unnest(array['anon', 'authenticated']) as role,
          unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) as privilege
     where has_table_privilege(role, 'public.default_privileges_probe', privilege) $$,
  'новая таблица в public закрыта для anon и authenticated'
);
select is_empty(
  $$ select role || ': ' || privilege
     from unnest(array['anon', 'authenticated']) as role,
          unnest(array['USAGE', 'SELECT', 'UPDATE']) as privilege
     where has_sequence_privilege(role, 'public.default_privileges_probe_id_seq', privilege) $$,
  'счётчик новой таблицы закрыт для anon и authenticated'
);
select is_empty(
  $$ select role
     from unnest(array['anon', 'authenticated']) as role
     where has_function_privilege(role, 'public.default_privileges_probe()', 'execute') $$,
  'новая функция в public закрыта для anon и authenticated'
);
select ok(
  has_function_privilege('service_role', 'public.default_privileges_probe()', 'execute'),
  'service_role (серверные задачи на секретном ключе) новую функцию вызывает'
);

set local role anon;
select throws_ok(
  'select public.default_privileges_probe()',
  '42501',
  'permission denied for function default_privileges_probe',
  'аноним не может вызвать новую функцию через rpc'
);
reset role;

-- Образец функции для rpc из .claude/rules/db.md: права выдаются явно и только вошедшему.
revoke execute on function public.default_privileges_probe() from public, anon;
grant execute on function public.default_privileges_probe() to authenticated;

set local role authenticated;
select lives_ok('select public.default_privileges_probe()', 'после явного grant вошедший вызывает функцию');
set local role anon;
select throws_ok(
  'select public.default_privileges_probe()',
  '42501',
  'permission denied for function default_privileges_probe',
  'grant вошедшему не открывает функцию анониму'
);
reset role;

select is_empty(
  $$ select format('%s — добавить: revoke execute on function %1$s from public, anon;', p.oid::regprocedure)
     from pg_proc p
     where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute') $$,
  'ни одну функцию public не может вызвать аноним'
);

select * from finish();
rollback;
