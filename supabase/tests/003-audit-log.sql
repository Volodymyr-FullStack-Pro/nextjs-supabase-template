-- Журнал изменений: каждая вставка, правка и удаление строки — запись с автором, старым и новым значением;
-- роли API (anon, authenticated, service_role) журнал не читают и не меняют, а владелец базы не может его
-- править, удалять и очищать; очистка аудируемой таблицы запрещена триггером audit.forbid_truncate().
-- Таблица создаётся внутри теста: проверяется сам журнал, а не таблица-пример, и файл остаётся после её удаления
-- (наличие триггеров у каждой таблицы public проверяет 900 по каталогу).
-- Проверка самого теста: снимите триггер log_append_only или выдайте grant select on audit.log — тест упадёт.
begin;
select plan(19);

-- Локальная база общая с e2e, и в журнале уже есть строки: тест смотрит только на строки после этой отметки.
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
select throws_ok('update audit.log set op = op', '42501', null, 'the database owner cannot change the log');
select throws_ok('delete from audit.log', '42501', null, 'the database owner cannot delete from the log');
select throws_ok('truncate audit.log', '42501', null, 'the database owner cannot truncate the log');

insert into public.audit_log_probe (title) values ('kept');
select throws_ok(
  'truncate public.audit_log_probe',
  '42501',
  'truncate audit_log_probe запрещён: строки удаляются по одной и попадают в журнал',
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
