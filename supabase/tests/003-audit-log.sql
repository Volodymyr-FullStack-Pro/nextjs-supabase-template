-- Журнал изменений: каждая вставка, правка и удаление заметки — строка с автором, старым и новым значением;
-- роли API журнал не читают и не меняют.
begin;
select plan(9);

-- Локальная база общая с e2e, и журнал уже не пуст: тест начинает с чистого, rollback вернёт строки.
delete from audit.log;

select tests.create_supabase_user('erin');

select tests.authenticate_as('erin');
insert into public.notes (owner_id, title) values (tests.get_supabase_uid('erin'), 'draft');
update public.notes set title = 'final' where title = 'draft';
delete from public.notes where title = 'final';

select tests.clear_authentication();
select results_eq(
  $$ select op, actor, table_name from audit.log order by id $$,
  $$ values ('INSERT', tests.get_supabase_uid('erin'), 'notes'),
            ('UPDATE', tests.get_supabase_uid('erin'), 'notes'),
            ('DELETE', tests.get_supabase_uid('erin'), 'notes') $$,
  'records insert, update and delete with the acting user'
);
select results_eq(
  $$ select old ->> 'title', new ->> 'title' from audit.log order by id $$,
  $$ values (null, 'draft'), ('draft', 'final'), ('final', null) $$,
  'keeps the old and the new row'
);
select is(
  (select count(distinct row_id)::int from audit.log),
  1,
  'links all three entries to the same note id'
);

select tests.authenticate_as('erin');
select throws_ok('select * from audit.log', '42501', 'permission denied for schema audit', 'authenticated cannot read the log');
select throws_ok(
  $$ insert into audit.log (table_name, op) values ('notes', 'INSERT') $$,
  '42501', 'permission denied for schema audit', 'authenticated cannot write the log'
);
select throws_ok('update audit.log set op = op', '42501', 'permission denied for schema audit', 'authenticated cannot change the log');
select throws_ok('delete from audit.log', '42501', 'permission denied for schema audit', 'authenticated cannot delete the log');

select tests.clear_authentication();
set local role anon;
select throws_ok('select * from audit.log', '42501', 'permission denied for schema audit', 'anonymous user cannot read the log');
select throws_ok('delete from audit.log', '42501', 'permission denied for schema audit', 'anonymous user cannot delete the log');

select * from finish();
rollback;
