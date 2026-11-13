set lock_timeout = '5s';
set statement_timeout = '60s';

-- Error messages in English; merged migrations are not edited (db.yml), so the functions are replaced.
create or replace function audit.forbid_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit.log is append-only: % is not allowed', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

create or replace function audit.forbid_truncate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'truncate % is not allowed: rows are deleted one by one so that each reaches the audit log', tg_table_name
    using errcode = 'insufficient_privilege';
end;
$$;

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
    raise exception 'changing id in % is not allowed: the id links a row to its history in the audit log', tg_table_name
      using errcode = 'insufficient_privilege';
  end if;
  insert into audit.log (actor, table_name, op, row_id, old, new)
  values ((select auth.uid()), tg_table_name, tg_op, coalesce(old_row, new_row) ->> 'id', old_row, new_row);
  return null;
end;
$$;
