-- Журнал только дополняется даже для владельца базы (postgres: SQL-редактор, прямое подключение db()):
-- правка, удаление и очистка audit.log завершаются ошибкой. Новая строка появляется только из audit.record().
create function audit.forbid_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit.log только дополняется: % запрещено', tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

revoke execute on function audit.forbid_change() from public, anon, authenticated, service_role;

create trigger log_append_only
  before update or delete on audit.log
  for each row execute function audit.forbid_change();

create trigger log_no_truncate
  before truncate on audit.log
  for each statement execute function audit.forbid_change();
