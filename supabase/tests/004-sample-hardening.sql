begin;
select plan(19);

select tests.create_supabase_user('frank');
insert into public.notes (owner_id, title, currency, client_request_id) values (tests.get_supabase_uid('frank'), 'kept', 'EUR', gen_random_uuid());

select throws_ok(
  $$ delete from auth.users where id = tests.get_supabase_uid('frank') $$,
  '23503',
  null,
  'a user with notes cannot be deleted: on delete restrict'
);

select throws_ok(
  $$ truncate public.notes $$,
  '42501',
  null,
  'truncate is blocked by the audit.forbid_truncate trigger'
);

select is(
  (select count(*) from public.notes where owner_id = tests.get_supabase_uid('frank')),
  1::bigint,
  'the row survives both attempts'
);

select tests.authenticate_as('frank');
select throws_ok(
  $$ insert into public.notes (owner_id, title, created_at, currency, client_request_id)
     values (tests.get_supabase_uid('frank'), 'задним числом', '2020-01-01', 'EUR', gen_random_uuid()) $$,
  '42501',
  'permission denied for table notes',
  'the client does not set created_at on insert'
);
select throws_ok(
  $$ insert into public.notes (id, owner_id, title, currency, client_request_id)
     values (gen_random_uuid(), tests.get_supabase_uid('frank'), 'свой id', 'EUR', gen_random_uuid()) $$,
  '42501',
  'permission denied for table notes',
  'the client does not set id on insert'
);
select throws_ok(
  $$ update public.notes set created_at = '2020-01-01' $$,
  '42501',
  'permission denied for table notes',
  'the client does not change created_at'
);
select throws_ok(
  $$ update public.notes set id = gen_random_uuid() $$,
  '42501',
  'permission denied for table notes',
  'the client does not change id'
);
select throws_ok(
  $$ update public.notes set owner_id = owner_id $$,
  '42501',
  'permission denied for table notes',
  'the client does not change owner_id'
);
select lives_ok(
  $$ update public.notes set title = 'kept, renamed', amount = '10.50' $$,
  'the owner changes the title and the amount'
);

select tests.clear_authentication();
select results_eq(
  $$ select title, amount::text from public.notes where owner_id = tests.get_supabase_uid('frank') $$,
  $$ values ('kept, renamed', '10.50') $$,
  'the edit of allowed columns reaches the row'
);
select throws_ok(
  $$ update public.notes set id = gen_random_uuid() where owner_id = tests.get_supabase_uid('frank') $$,
  '42501',
  'changing id in notes is not allowed: the id links a row to its history in the audit log',
  'the database owner cannot change id either: the audit trigger rejects it'
);

select tests.create_supabase_user('gina');
select tests.authenticate_as('frank');
select lives_ok(
  $$ insert into public.notes (owner_id, title, currency, client_request_id)
     values (tests.get_supabase_uid('frank'), 'первая отправка', 'EUR', '00000000-0000-4000-8000-000000000001') $$,
  'the first form submission creates a row'
);
select throws_ok(
  $$ insert into public.notes (owner_id, title, currency, client_request_id)
     values (tests.get_supabase_uid('frank'), 'повтор', 'EUR', '00000000-0000-4000-8000-000000000001') $$,
  '23505',
  'duplicate key value violates unique constraint "notes_owner_id_client_request_id_key"',
  'a retry with the same client_request_id is rejected: on this code the repository returns the existing row'
);
select throws_ok(
  $$ update public.notes set client_request_id = gen_random_uuid() $$,
  '42501',
  'permission denied for table notes',
  'the client does not change client_request_id'
);
select throws_ok(
  $$ insert into public.notes (owner_id, title, currency)
     values (tests.get_supabase_uid('frank'), 'без ключа', 'EUR') $$,
  '23502',
  null,
  'an insert without client_request_id is rejected'
);
select tests.authenticate_as('gina');
select lives_ok(
  $$ insert into public.notes (owner_id, title, currency, client_request_id)
     values (tests.get_supabase_uid('gina'), 'чужой ключ', 'EUR', '00000000-0000-4000-8000-000000000001') $$,
  'the same key of another owner neither conflicts nor reveals their row'
);
select tests.clear_authentication();

-- 003 and 002 test the audit log and private.mfa_ok() on their own tables; here only that notes is wired to both.
select results_eq(
  $$ select distinct actor from audit.log
     where table_name = 'notes' and op = 'UPDATE' and new ->> 'title' = 'kept, renamed' $$,
  $$ values (tests.get_supabase_uid('frank')) $$,
  'a note edit is logged with its author'
);
select tests.add_verified_totp('frank');
select tests.authenticate_as('frank', 'aal1');
select is_empty('select * from public.notes', 'with a verified factor, an aal1 session sees no notes');
select tests.authenticate_as('frank', 'aal2');
select isnt_empty('select * from public.notes', 'an aal2 session sees the notes');
select tests.clear_authentication();

select * from finish();
rollback;
