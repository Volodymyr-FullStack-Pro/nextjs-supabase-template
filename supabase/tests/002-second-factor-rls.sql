-- Behaviour of private.mfa_ok() and the restrictive policy every public table carries (that each table has it is
-- checked by 900 from the catalog): with a verified TOTP, rows are visible and writable only in an aal2 session.
-- Self-check: replace the body of private.mfa_ok() with true and the "aal1 with factor" tests fail.
begin;
select plan(13);

create table public.second_factor_probe (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete restrict,
  title text not null
);
alter table public.second_factor_probe enable row level security;
grant select, delete on public.second_factor_probe to authenticated;
grant insert (owner_id, title), update (title) on public.second_factor_probe to authenticated;
create policy second_factor_probe_owner on public.second_factor_probe
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
create policy second_factor_probe_second_factor on public.second_factor_probe
  as restrictive
  for all to authenticated
  using ((select private.mfa_ok()))
  with check ((select private.mfa_ok()));

select tests.create_supabase_user('carol');
select tests.create_supabase_user('dave');
select tests.add_verified_totp('carol');

insert into public.second_factor_probe (owner_id, title)
values (tests.get_supabase_uid('carol'), 'carol row'), (tests.get_supabase_uid('dave'), 'dave row');

select tests.authenticate_as('carol', 'aal1');
select is_empty('select * from public.second_factor_probe', 'aal1 with factor: sees nothing');
select throws_ok(
  $$ insert into public.second_factor_probe (owner_id, title) values (tests.get_supabase_uid('carol'), 'aal1 insert') $$,
  '42501',
  'new row violates row-level security policy "second_factor_probe_second_factor" for table "second_factor_probe"',
  'aal1 with factor: cannot insert'
);
select lives_ok($$ update public.second_factor_probe set title = 'aal1 update' $$, 'aal1 with factor: update runs');
select lives_ok($$ delete from public.second_factor_probe $$, 'aal1 with factor: delete runs');
select ok(not (select private.mfa_ok()), 'aal1 with factor: private.mfa_ok() is false');

select tests.authenticate_as('carol', 'aal2');
select results_eq(
  'select title from public.second_factor_probe',
  array['carol row'],
  'aal2 with factor: sees own rows, untouched by the aal1 attempts'
);
select lives_ok(
  $$ insert into public.second_factor_probe (owner_id, title) values (tests.get_supabase_uid('carol'), 'aal2 insert') $$,
  'aal2 with factor: can insert'
);
select ok((select private.mfa_ok()), 'aal2 with factor: private.mfa_ok() is true');

select tests.authenticate_as('dave', 'aal1');
select results_eq('select title from public.second_factor_probe', array['dave row'], 'no factor at aal1: sees own rows');
select lives_ok(
  $$ insert into public.second_factor_probe (owner_id, title) values (tests.get_supabase_uid('dave'), 'dave second') $$,
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
