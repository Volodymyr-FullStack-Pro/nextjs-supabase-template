set lock_timeout = '5s';
set statement_timeout = '60s';

-- Образец для финансовых таблиц. Удаление пользователя не стирает его строки: журнал и отчёты теряли бы
-- автора и суммы; строки снимаются с пользователя осознанно, отдельной операцией.
-- squawk-ignore ban-drop-constraint
alter table public.notes drop constraint notes_owner_id_fkey;
alter table public.notes
  add constraint notes_owner_id_fkey
  foreign key (owner_id) references auth.users (id) on delete restrict not valid;
-- Таблица-пример без данных: проверка существующих строк мгновенна. На живой таблице validate идёт
-- отдельной миграцией, чтобы не держать блокировку чтения на время проверки.
-- squawk-ignore constraint-missing-not-valid
alter table public.notes validate constraint notes_owner_id_fkey;

-- truncate обходит построчный триггер журнала audit.record(): на аудируемых таблицах он запрещён,
-- строки удаляются по одной и попадают в журнал.
create function audit.forbid_truncate()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'truncate % запрещён: строки удаляются по одной и попадают в журнал', tg_table_name
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger notes_forbid_truncate
  before truncate on public.notes
  for each statement execute function audit.forbid_truncate();
