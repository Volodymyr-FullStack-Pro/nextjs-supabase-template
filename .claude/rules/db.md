---
paths:
  - 'src/shared/infrastructure/db/**'
  - 'src/modules/**/infrastructure/**'
  - 'supabase/**'
  - 'drizzle.config.ts'
  - 'drizzle/**'
---

# База данных: Supabase, RLS, Drizzle, деньги

- Миграции — в `supabase/migrations/<timestamp>_name.sql` (источник правды). Схема Drizzle `src/shared/infrastructure/db/schema.ts` повторяет их и даёт типы; `npm run db:generate` строит SQL в `drizzle/` только для сверки.
- Каждая новая таблица: `enable row level security` в той же миграции, отдельные политики на select / insert / update / delete, `to authenticated`, условие через `(select auth.uid())`, индекс на колонку политики.
- `security definer` — только с `set search_path = ''` и вне открытых схем; никакой авторизации по `user_metadata`.
- Деньги и доли: `numeric(18, 2)` / `numeric(12, 6)` в базе, в Drizzle `numeric()` как строка (`mode: 'number'` запрещён), расчёты через `decimal.js`, округление только на выводе. Через клиент Supabase (PostgREST) `numeric` приходит числом JavaScript и теряет точность — денежные колонки выбирать текстом: `.select('id, amount::text')`.
- `update` и `delete` всегда с `where`.
- После новой миграции — `npm run db:types`: типы для supabase-js генерируются из локальной базы в `src/shared/infrastructure/supabase/types.ts` и руками не правятся. В шаблоне этот файл — ручная заглушка для таблицы `notes`; первый запуск `db:types` заменяет его сгенерированным.
- Пользовательские запросы — через клиент Supabase (RLS применяется); `db()` из `src/shared/infrastructure/db` — прямое подключение мимо RLS, только для серверных задач; репозитории модулей живут в `infrastructure/` и реализуют порты из `application/`.
- Новая политика без pgTAP-теста в `supabase/tests/` с негативным случаем не считается готовой: чужой пользователь не видит, не меняет, не удаляет и не передаёт себе строку, аноним не видит ничего (образец — `001-notes-rls.sql`); `supabase db advisors --local --fail-on warn` зелёный. Списки — с `.limit()`, строка поиска — с пределом длины.

- Индексы под запросы, не «на всякий случай»: на каждую FK-колонку, на колонки политик RLS и на то, по чему фильтруют и сортируют списки — составной в порядке «фильтр → сортировка» (`(owner_id, created_at desc)`, как в `notes`); частичный индекс под фильтр по статусу (`where status = 'open'`). Таблицы в сотни строк индексов не требуют. Проверка: `supabase db advisors --local` (`unindexed_foreign_keys`) и `explain (analyze, buffers)` для запроса по большой таблице перед «готово».
- Запросы: только нужные колонки (`select('id, title, created_at')`), лимит у каждого списка, пагинация keyset по `(created_at, id)`, не `offset` вглубь; без N+1 — один запрос с `in (...)`, join или представление; агрегаты и снимки считаются в базе (функция, представление, таблица-снимок), не циклом на сервере.
- Целостность — в базе: инварианты ограничениями (`not null`, `check (amount > 0)`, FK, `unique`), не только в Zod; нарушение `unique` (код `23505`) репозиторий превращает в `ConflictError`. Несколько таблиц в одной операции — одна транзакция (функция базы через `rpc` или `db().transaction`). Идемпотентность: операция, которую пользователь может повторить (двойной клик, повтор после обрыва сети), принимает `client_request_id uuid` с `unique (owner_id, client_request_id)` — повтор возвращает уже созданную запись. Запись, которую правят несколько людей, — колонка `version` и `update … where id = ? and version = ?`, иначе `ConflictError`.
- Типы колонок: `uuid default gen_random_uuid()`, `timestamptz` (UTC) без `timestamp` для моментов, `date` для учётных периодов и дат без времени (месяц отчёта, дата закрытия), `text` с `check (char_length(…) <= N)` вместо `varchar(N)`, `numeric` для денег, `boolean not null default …`; перечисления — `text` + `check`, `enum` только для устоявшихся.

Подробно: скилы `dev-kit:supabase-rls-drizzle`, `dev-kit:money-decimal`; перед любым изменением базы — скил `postgres-best-practices:supabase-postgres-best-practices`.
