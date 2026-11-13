-- Every insert, update and delete is logged with its actor and the old and new row; API roles neither read nor
-- change the log, the database owner cannot edit, delete or truncate it, and truncating an audited table is rejected.
-- That every public table has these triggers is checked by 900 from the catalog.
-- Self-check: drop the log_append_only trigger or grant select on audit.log and the test fails.
begin;
select plan(19);

-- The local database is shared with e2e, so the log already has rows: the test looks only past this mark.
create temp table log_start on commit drop as select coalesce(max(id), 0) as id from audit.log;

create table public.audit_log_probe (
  id uuid primary key default gen_random_uuid(),
  title text not null
);
grant select, insert, update, delete on public.audit_log_probe to authenticated;
create trigger audit_log_probe_audit
  after insert or update or delete on public.audit_log_probe
  for each row execute function audit.record();
create trigger audit_log_probe_forbid_truncate
  before truncate on public.audit_log_probe
  for each statement execute function audit.forbid_truncate();

select tests.create_supabase_user('erin');

select tests.authenticate_as('erin');
insert into public.audit_log_probe (title) values ('draft');
update public.audit_log_probe set title = 'final' where title = 'draft';
delete from public.audit_log_probe where title = 'final';

select tests.clear_authentication();
select results_eq(
  $$ select op, actor, table_name from audit.log where id > (select id from log_start) order by id $$,
  $$ values ('INSERT', tests.get_supabase_uid('erin'), 'audit_log_probe'),
            ('UPDATE', tests.get_supabase_uid('erin'), 'audit_log_probe'),
            ('DELETE', tests.get_supabase_uid('erin'), 'audit_log_probe') $$,
  'records insert, update and delete with the acting user'
);
select results_eq(
  $$ select old ->> 'title', new ->> 'title' from audit.log where id > (select id from log_start) order by id $$,
  $$ values (null, 'draft'), ('draft', 'final'), ('final', null) $$,
  'keeps the old and the new row'
);
select is(
  (select count(distinct row_id)::int from audit.log where id > (select id from log_start)),
  1,
  'links all three entries to the same row id'
);
select throws_ok('update audit.log set op = op', '42501', 'audit.log is append-only: UPDATE is not allowed', 'the database owner cannot change the log');
select throws_ok('delete from audit.log', '42501', 'audit.log is append-only: DELETE is not allowed', 'the database owner cannot delete from the log');
select throws_ok('truncate audit.log', '42501', 'audit.log is append-only: TRUNCATE is not allowed', 'the database owner cannot truncate the log');

insert into public.audit_log_probe (title) values ('kept');
select throws_ok(
  'truncate public.audit_log_probe',
  '42501',
  'truncate audit_log_probe is not allowed: rows are deleted one by one so that each reaches the audit log',
  'the database owner cannot truncate an audited table'
);
select is((select count(*)::int from public.audit_log_probe), 1, 'the row survives the truncate attempt');

select tests.authenticate_as('erin');
select throws_ok('select * from audit.log', '42501', 'permission denied for schema audit', 'authenticated cannot read the log');
select throws_ok(
  $$ insert into audit.log (table_name, op) values ('audit_log_probe', 'INSERT') $$,
  '42501', 'permission denied for schema audit', 'authenticated cannot write the log'
);
select throws_ok('update audit.log set op = op', '42501', 'permission denied for schema audit', 'authenticated cannot change the log');
select throws_ok('delete from audit.log', '42501', 'permission denied for schema audit', 'authenticated cannot delete the log');
select throws_ok('select audit.record()', '42501', 'permission denied for schema audit', 'authenticated cannot call audit.record');

select tests.clear_authentication();
set local role service_role;
select throws_ok('select * from audit.log', '42501', 'permission denied for schema audit', 'service_role cannot read the log');
select throws_ok(
  $$ insert into audit.log (table_name, op) values ('audit_log_probe', 'INSERT') $$,
  '42501', 'permission denied for schema audit', 'service_role cannot write the log'
);
select throws_ok('update audit.log set op = op', '42501', 'permission denied for schema audit', 'service_role cannot change the log');
select throws_ok('delete from audit.log', '42501', 'permission denied for schema audit', 'service_role cannot delete the log');

reset role;
set local role anon;
select throws_ok('select * from audit.log', '42501', 'permission denied for schema audit', 'anonymous user cannot read the log');
select throws_ok('delete from audit.log', '42501', 'permission denied for schema audit', 'anonymous user cannot delete the log');

select * from finish();
rollback;
