-- Связь записи с её историей: журнал находит историю по (table_name, row_id), поэтому row_id — это id строки
-- до изменения, а смена id отклоняется для любой роли, включая владельца базы.
-- Таблица создаётся внутри теста: проверяется сам audit.record(), а не таблица-пример.
-- Проверка самого теста: верните audit.record() из *_audit_log.sql — смена id пройдёт, история разорвётся.
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
  'смена id в audit_identity_probe запрещена: по id запись связана со своей историей в журнале',
  'смена id отклоняется'
);
select is(
  (select label from public.audit_identity_probe where id = 1),
  'changed',
  'строка осталась под прежним id'
);

delete from public.audit_identity_probe where id = 1;

select results_eq(
  $$ select op, row_id from audit.log
     where id > (select id from log_start) and table_name = 'audit_identity_probe' order by id $$,
  $$ values ('INSERT', '1'), ('UPDATE', '1'), ('DELETE', '1') $$,
  'вся история строки лежит под одним row_id, отклонённая смена id в журнал не попала'
);

select * from finish();
rollback;
