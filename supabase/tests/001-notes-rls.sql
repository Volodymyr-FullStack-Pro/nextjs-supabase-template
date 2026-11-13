begin;
select plan(13);

select tests.create_supabase_user('alice');
select tests.create_supabase_user('bob');

insert into public.notes (owner_id, title, currency, client_request_id)
values (tests.get_supabase_uid('alice'), 'alice note', 'EUR', gen_random_uuid());

select tests.authenticate_as('alice');
select is((select count(*)::int from public.notes), 1, 'owner sees own note');
select lives_ok(
  $$ insert into public.notes (owner_id, title, currency, client_request_id) values (tests.get_supabase_uid('alice'), 'second', 'EUR', gen_random_uuid()) $$,
  'owner can insert own note'
);

select tests.authenticate_as('bob');
select is_empty('select * from public.notes', 'other user sees nothing');
select throws_ok(
  $$ insert into public.notes (owner_id, title, currency, client_request_id) values (tests.get_supabase_uid('alice'), 'forged', 'EUR', gen_random_uuid()) $$,
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
  'permission denied for table notes',
  'owner cannot hand a note to another user: no privilege on the owner_id column'
);
-- Defense in depth: even with a column grant on owner_id, the update policy still blocks handing a row over.
select tests.clear_authentication();
grant update (owner_id) on public.notes to authenticated;
select tests.authenticate_as('alice');
select throws_ok(
  $$ update public.notes set owner_id = tests.get_supabase_uid('bob') where title = 'second' $$,
  '42501',
  'new row violates row-level security policy for table "notes"',
  'owner cannot hand a note to another user even with the column privilege'
);
select tests.clear_authentication();
revoke update (owner_id) on public.notes from authenticated;
select tests.authenticate_as('alice');
select lives_ok($$ update public.notes set title = 'renamed' where title = 'second' $$, 'owner can update own note');
select lives_ok($$ delete from public.notes where title = 'renamed' $$, 'owner can delete own note');

select tests.clear_authentication();
set local role anon; -- clear_authentication switches back to postgres, which bypasses RLS
select throws_ok(
  'select * from public.notes',
  '42501',
  'permission denied for table notes',
  'anonymous user cannot read notes'
);
select throws_ok(
  $$ insert into public.notes (owner_id, title, currency, client_request_id) values (gen_random_uuid(), 'anonymous', 'EUR', gen_random_uuid()) $$,
  '42501',
  'permission denied for table notes',
  'anonymous user cannot insert'
);

select * from finish();
rollback;
