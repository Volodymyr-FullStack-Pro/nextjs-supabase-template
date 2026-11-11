set lock_timeout = '5s';
set statement_timeout = '60s';

-- Историю записи журнал находит по (table_name, row_id). Прежняя audit.record() брала row_id из новой строки и не
-- мешала менять id: после update … set id = … правки до смены оставались под старым id, и история по текущему id
-- начиналась с пустого места. Теперь row_id — id строки до изменения, а смена id отклоняется для любой роли,
-- включая владельца базы (как truncate аудируемой таблицы). Триггеры таблиц менять не нужно: функция та же.
create or replace function audit.record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  new_row jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
begin
  if tg_op = 'UPDATE' and (old_row ->> 'id') is distinct from (new_row ->> 'id') then
    raise exception 'смена id в % запрещена: по id запись связана со своей историей в журнале', tg_table_name
      using errcode = 'insufficient_privilege';
  end if;
  insert into audit.log (actor, table_name, op, row_id, old, new)
  values ((select auth.uid()), tg_table_name, tg_op, coalesce(old_row, new_row) ->> 'id', old_row, new_row);
  return null;
end;
$$;
