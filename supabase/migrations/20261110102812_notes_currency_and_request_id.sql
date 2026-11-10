set lock_timeout = '5s';
set statement_timeout = '60s';

-- Образец правил денег: у суммы есть валюта, а повторная отправка формы не создаёт вторую строку.
-- Обе колонки добавляются одинаково: колонка без значения по умолчанию → заполнение существующих строк →
-- not null. Таблица-пример без данных, поэтому всё в одной миграции и с squawk-ignore; на живой большой таблице
-- заполнение идёт порциями, а not null ставится через check (… is not null) not valid и validate отдельными
-- миграциями (тогда set not null не читает таблицу).

-- Валюта — код ISO 4217 (три заглавные буквы). Значения по умолчанию у колонки нет: сумма без названной валюты
-- не существует, и забытая валюта должна быть ошибкой вставки, а не тихим евро. Существующие строки получают
-- EUR — именно так их до сих пор показывал экран (formatMoney подставлял евро).
alter table public.notes add column currency text;
update public.notes set currency = 'EUR' where currency is null;
-- squawk-ignore adding-not-nullable-field
alter table public.notes alter column currency set not null;
alter table public.notes
  add constraint notes_currency_format check (currency ~ '^[A-Z]{3}$') not valid;
-- squawk-ignore constraint-missing-not-valid
alter table public.notes validate constraint notes_currency_format;

-- Идемпотентность: форма создаёт client_request_id при отправке и повторяет его, пока не получит ответ; вторая
-- вставка с тем же ключом того же владельца упирается в unique (23505), и репозиторий возвращает уже созданную
-- строку. Ключ уникален в пределах владельца: чужой ключ не мешает и не выдаёт существование чужой строки.
-- Существующие строки получают случайный ключ. В новой таблице это две строки в create table:
-- client_request_id uuid not null и unique (owner_id, client_request_id).
alter table public.notes add column client_request_id uuid;
update public.notes set client_request_id = gen_random_uuid() where client_request_id is null;
-- squawk-ignore adding-not-nullable-field
alter table public.notes alter column client_request_id set not null;
create unique index notes_owner_id_client_request_id_key on public.notes (owner_id, client_request_id);
alter table public.notes
  add constraint notes_owner_id_client_request_id_key unique using index notes_owner_id_client_request_id_key;

-- Права по колонкам: обе новые колонки клиент задаёт при вставке, менять может только валюту.
grant insert (currency, client_request_id) on public.notes to authenticated;
grant update (currency) on public.notes to authenticated;
