---
paths:
  - 'src/shared/infrastructure/db/**'
  - 'src/modules/**/infrastructure/**'
  - 'supabase/**'
  - 'drizzle.config.ts'
  - 'drizzle/**'
---

# База данных: Supabase, RLS, Drizzle, деньги

- Источник правды — миграции `supabase/migrations/<timestamp>_name.sql`. `src/shared/infrastructure/db/schema.ts` повторяет их ради типов Drizzle; `npm run db:generate` пишет SQL в `drizzle/` только для сверки.
- Миграцию, уже слитую в `main`, не правят и не удаляют: она выложена на staging, правка разведёт базу и историю миграций. Исправление — новой миграцией вперёд; CI (`db.yml`, шаг «Merged migrations are not changed») это проверяет.
- Новая миграция начинается с `set lock_timeout = '5s';` и `set statement_timeout = '60s';` (перенос данных — больше, явно): миграция не ждёт блокировку бесконечно и не вешает приложение. Перед остановкой задачи с миграцией — `npm run db:check-migrations` (Squawk: блокировки, удаление колонок, `int` вместо `bigint`) и `supabase db lint` (ошибки в функциях базы). Осознанное исключение — `-- squawk-ignore <правило>` перед оператором и строка D-NNN с причиной.
- Data API закрыт по умолчанию (`supabase/migrations/20251231000000_default_privileges.sql`): миграция таблицы сама выдаёт `grant` роли `authenticated` только на операции, у которых есть политика; `anon` — ничего.
- После миграции — `npm run db:types`: `src/shared/infrastructure/supabase/types.ts` генерируется из локальной базы и руками не правится; CI (`db.yml`) падает, если файл не совпадает с миграциями.
- Прямое подключение `db()` — через пул Supavisor (transaction, порт 6543): `prepare: false`, одно соединение, вне локальной машины TLS с проверкой сертификата (`verify-full`; свой центр сертификации — `DATABASE_CA_CERT`) (`src/shared/infrastructure/db/index.ts`).
- Ссылка на `auth.users` — `on delete restrict`, не `cascade`: удаление пользователя не стирает финансовые строки и автора в журнале. На аудируемой таблице — `before truncate … execute function audit.forbid_truncate()`: `truncate` обходит построчный журнал (образец — `*_notes_sample_hardening.sql`, pgTAP `004`).
- Журнал `audit.log` защищён триггером от правки, удаления и очистки через SQL-редактор и `db()`; от владельца, который снимет триггер (`disable trigger`, `session_replication_role`), он не защищён — это уровень доступа к панели Supabase, а не кода.
- Образец таблицы, индекса, прав и политик — `supabase/migrations/20260101000000_notes.sql`, pgTAP — `supabase/tests/001-notes-rls.sql`, репозиторий — `src/modules/notes/infrastructure/notes-repository.supabase.ts`.
- Каждая таблица с данными пользователя, кроме политик владельца: ограничивающая политика второго фактора `as restrictive for all to authenticated using ((select private.mfa_ok())) with check ((select private.mfa_ok()))` и триггер журнала `after insert or update or delete … for each row execute function audit.record()` (образцы — `*_second_factor_policies.sql`, `*_audit_log.sql`). Схемы `private` и `audit` в Data API не открываются.
- pgTAP: `tests.authenticate_as('alice', 'aal2')` — сессия со вторым фактором, `tests.add_verified_totp('alice')` — подтверждённый TOTP. Хелперы остаются в базе после `supabase test db`, поэтому команда — только локально (не `--remote`).
- Деньги: суммы в валюте `numeric(18,2)`, количества (акции, монеты) `numeric(28,8)`, цены и курсы `numeric(28,10)`, доли владения `numeric(12,10)`; supabase-js отдаёт `numeric` числом JavaScript, поэтому денежные колонки выбираются текстом (`amount::text`, образец — `notes-repository.supabase.ts`), а пишутся строкой (`insert({ amount: value })`, где `value` — строка из `Decimal.toFixed()`; PostgREST принимает её как `numeric`). `npm run db:types` помечает `numeric`-колонки в `types.ts` типом `string`, так что число туда не передать.
- Строка поиска — с пределом длины.
- Типы колонок: `uuid default gen_random_uuid()`; момент — `timestamptz` (UTC), не `timestamp`; учётный период и дата без времени (месяц отчёта, дата закрытия) — `date`; `text` + `check (char_length(…) <= N)` вместо `varchar(N)`; `boolean not null default …`; перечисление — `text` + `check`, `enum` — только для устоявшихся наборов.

Подробно: скилы `dev-kit:supabase-rls-drizzle`, `dev-kit:money-decimal`; перед любым изменением базы — `postgres-best-practices:supabase-postgres-best-practices`.
