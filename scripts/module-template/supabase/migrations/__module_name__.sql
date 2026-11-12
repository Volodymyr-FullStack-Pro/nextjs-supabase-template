-- Таблица __module_name__ целиком, одной миграцией (.claude/rules/db-tables.md). Заголовок с lock_timeout и
-- statement_timeout вписывает scripts/db-new.mjs. Колонки title, amount, currency — заготовка: замените их
-- полями сущности до supabase migration up; всё остальное нужно любой таблице с данными пользователя, и
-- наличие каждого пункта проверяет по каталогу supabase/tests/900-table-conventions.sql.
create table public.__module_name__ (
  id uuid primary key default gen_random_uuid(),
  -- Удаление пользователя не стирает его строки: restrict, не cascade.
  owner_id uuid not null references auth.users (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 200),
  -- Сумма в валюте: numeric(18,2) без значения по умолчанию, NaN отвергается; валюта рядом — код ISO 4217,
  -- тоже без значения по умолчанию (забытая валюта — ошибка вставки, а не тихий евро).
  amount numeric(18, 2) not null check (amount <> 'NaN'::numeric and abs(amount) <> 'Infinity'::numeric),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  -- Ключ повтора: форма создаёт его при отправке; вторая вставка с тем же ключом того же владельца получает
  -- 23505 с именем этого ограничения, и репозиторий возвращает уже созданную строку.
  client_request_id uuid not null,
  created_at timestamptz not null default now(),
  constraint __module_name___owner_id_client_request_id_key unique (owner_id, client_request_id)
);

-- Индекс под запрос списка: фильтр по владельцу (он же в политике и во внешнем ключе) и сортировка по дате.
create index __module_name___owner_id_created_at_idx on public.__module_name__ (owner_id, created_at desc);

alter table public.__module_name__ enable row level security;

-- Права только вошедшему и только на операции, у которых есть политика; anon — ничего. Вставка и правка —
-- по колонкам: id и created_at ставит база, owner_id и client_request_id после вставки не меняются.
-- Сущность не правится или не удаляется — уберите update или delete отсюда, её политику ниже и проверки в pgTAP.
grant select, delete on public.__module_name__ to authenticated;
grant insert (owner_id, title, amount, currency, client_request_id) on public.__module_name__ to authenticated;
grant update (title, amount, currency) on public.__module_name__ to authenticated;

create policy "__module_name__: owner selects" on public.__module_name__
  for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy "__module_name__: owner inserts" on public.__module_name__
  for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "__module_name__: owner updates" on public.__module_name__
  for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "__module_name__: owner deletes" on public.__module_name__
  for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- Второй фактор: ограничивающая политика складывается с политиками владельца через AND.
create policy "__module_name__: second factor when enrolled" on public.__module_name__
  as restrictive
  for all to authenticated
  using ((select private.mfa_ok()))
  with check ((select private.mfa_ok()));

-- Журнал изменений и запрет truncate (он обходит построчный журнал).
create trigger __module_name___audit
  after insert or update or delete on public.__module_name__
  for each row execute function audit.record();

create trigger __module_name___forbid_truncate
  before truncate on public.__module_name__
  for each statement execute function audit.forbid_truncate();
