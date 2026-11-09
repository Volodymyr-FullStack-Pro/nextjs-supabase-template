-- Журнал изменений: кто, когда и что поменял в строке (старое и новое значение целиком).
-- Схема audit закрыта для ролей API; пишет только триггер (security definer), журнал только дополняется.
create schema if not exists audit;
revoke all on schema audit from public, anon, authenticated, service_role;

create table audit.log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  table_name text not null,
  op text not null check (op in ('INSERT', 'UPDATE', 'DELETE')),
  row_id text,
  old jsonb,
  new jsonb
);

-- История одной записи — по таблице и id, свежие сверху.
create index log_table_name_row_id_at_idx on audit.log (table_name, row_id, at desc);

alter table audit.log enable row level security;
revoke all on table audit.log from public, anon, authenticated, service_role;
revoke all on sequence audit.log_id_seq from public, anon, authenticated, service_role;

create function audit.record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into audit.log (actor, table_name, op, row_id, old, new)
  values (
    (select auth.uid()),
    tg_table_name,
    tg_op,
    coalesce(to_jsonb(new), to_jsonb(old)) ->> 'id',
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return null;
end;
$$;

revoke execute on function audit.record() from public, anon, authenticated, service_role;

-- Каждой таблице с данными пользователя — такой же триггер.
create trigger notes_audit
  after insert or update or delete on public.notes
  for each row execute function audit.record();
