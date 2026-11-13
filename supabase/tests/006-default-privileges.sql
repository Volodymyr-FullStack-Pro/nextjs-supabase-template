-- A new table, its sequence and a new function in public are closed to anon and authenticated until a migration grants
-- access; an rpc function is opened only by an explicit grant, and only to a signed-in user.
-- Self-check: reset the database without *_functions_closed_by_default.sql and the function checks fail.
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
  'a new public table is closed to anon and authenticated'
);
select is_empty(
  $$ select role || ': ' || privilege
     from unnest(array['anon', 'authenticated']) as role,
          unnest(array['USAGE', 'SELECT', 'UPDATE']) as privilege
     where has_sequence_privilege(role, 'public.default_privileges_probe_id_seq', privilege) $$,
  'the sequence of a new table is closed to anon and authenticated'
);
select is_empty(
  $$ select role
     from unnest(array['anon', 'authenticated']) as role
     where has_function_privilege(role, 'public.default_privileges_probe()', 'execute') $$,
  'a new public function is closed to anon and authenticated'
);
select ok(
  has_function_privilege('service_role', 'public.default_privileges_probe()', 'execute'),
  'service_role (server jobs on the secret key) calls a new function'
);

set local role anon;
select throws_ok(
  'select public.default_privileges_probe()',
  '42501',
  'permission denied for function default_privileges_probe',
  'an anonymous user cannot call a new function through rpc'
);
reset role;

revoke execute on function public.default_privileges_probe() from public, anon;
grant execute on function public.default_privileges_probe() to authenticated;

set local role authenticated;
select lives_ok('select public.default_privileges_probe()', 'a signed-in user calls the function after an explicit grant');
set local role anon;
select throws_ok(
  'select public.default_privileges_probe()',
  '42501',
  'permission denied for function default_privileges_probe',
  'a grant to signed-in users does not open the function to anonymous ones'
);
reset role;

select is_empty(
  $$ select format('%s: add revoke execute on function %1$s from public, anon;', p.oid::regprocedure)
     from pg_proc p
     where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'execute') $$,
  'no public function can be called by an anonymous user'
);

select * from finish();
rollback;
