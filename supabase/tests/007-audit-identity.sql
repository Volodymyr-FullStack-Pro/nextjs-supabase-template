-- The audit log finds a row's history by (table_name, row_id), so row_id is the id before the change, and changing
-- the id is rejected for every role, including the database owner.
-- Self-check: restore audit.record() from *_audit_log.sql and the id change goes through, splitting the history.
begin;
select plan(3);

create temp table log_start on commit drop as select coalesce(max(id), 0) as id from audit.log;

create table public.audit_identity_probe (id bigint primary key, label text not null);
create trigger audit_identity_probe_audit
  after insert or update or delete on public.audit_identity_probe
  for each row execute function audit.record();

insert into public.audit_identity_probe (id, label) values (1, 'created');
update public.audit_identity_probe set label = 'changed' where id = 1;

select throws_ok(
  $$ update public.audit_identity_probe set id = 2 where id = 1 $$,
  '42501',
  'changing id in audit_identity_probe is not allowed: the id links a row to its history in the audit log',
  'an id change is rejected'
);
select is(
  (select label from public.audit_identity_probe where id = 1),
  'changed',
  'the row keeps its previous id'
);

delete from public.audit_identity_probe where id = 1;

select results_eq(
  $$ select op, row_id from audit.log
     where id > (select id from log_start) and table_name = 'audit_identity_probe' order by id $$,
  $$ values ('INSERT', '1'), ('UPDATE', '1'), ('DELETE', '1') $$,
  'the whole history is under one row_id and the rejected id change is not logged'
);

select * from finish();
rollback;
