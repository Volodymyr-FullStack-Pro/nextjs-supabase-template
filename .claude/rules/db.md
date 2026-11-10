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
- Новая миграция — `npm run db:new <имя>` (`scripts/db-new.mjs`): создаёт файл и вписывает в начало `set lock_timeout = '5s';` и `set statement_timeout = '60s';` (перенос данных — больше, явно) — миграция не ждёт блокировку бесконечно и не вешает приложение; голый `supabase migration new` в оболочке Claude Code ждёт ввод и зависает. Применить локально — `supabase migration up` (только новые файлы, данные остаются; `supabase db reset` пересоздаёт базу целиком), затем `npm run db:types` и `supabase test db`. Перед остановкой задачи с миграцией — `npm run db:check-migrations` (Squawk: блокировки, удаление колонок, `int` вместо `bigint`) и `supabase db lint` (ошибки в функциях базы). Осознанное исключение — `-- squawk-ignore <правило>` перед оператором и строка D-NNN с причиной.
- Data API закрыт по умолчанию: новая таблица, счётчик и функция в `public` не получают прав `anon` и `authenticated` (pgTAP `006`). Таблицы и счётчики закрывает `*_default_privileges.sql`, функции — `*_functions_closed_by_default.sql`: право PUBLIC на функции глобальное, и снимает его только `alter default privileges for role postgres revoke execute on functions from public` без `in schema` (форма `in schema public` из первой миграции на функции не действует). Миграция таблицы сама выдаёт `grant` роли `authenticated` только на операции, у которых есть политика; `anon` — ничего. Правило действует в любой схеме: функции, которую от имени пользователя зовёт политика, представление или значение по умолчанию (как `private.mfa_ok()`), нужен явный `grant execute … to authenticated`.
- Функция для `rpc` (несколько таблиц одной транзакцией, запись от имени системы) лежит в `public` — остальные схемы в Data API не открыты. `security definer` обходит RLS, поэтому право проверяет сама функция, первым делом; имена в теле — со схемой; деньги возвращаются `text`; права выдаются явно, только вошедшему. Если права владельца не нужны — без `security definer`: тогда внутри действуют RLS и права вызывающего. pgTAP функции: аноним — `42501`, чужой — отказ, свой — результат.

  ```sql
  create function public.close_period(period_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
  as $$
  begin
    if (select auth.uid()) is null or not (select private.mfa_ok()) then
      raise exception 'нет доступа' using errcode = 'insufficient_privilege';
    end if;
    -- право на объект (владелец, таблица прав) — тоже здесь, до первой записи
  end;
  $$;
  revoke execute on function public.close_period(uuid) from public, anon;
  grant execute on function public.close_period(uuid) to authenticated;
  ```

- После миграции — `npm run db:types`: `src/shared/infrastructure/supabase/types.ts` генерируется из локальной базы и руками не правится; CI (`db.yml`) падает, если файл не совпадает с миграциями.
- Прямое подключение `db()` (Drizzle, `src/shared/infrastructure/db/index.ts`) — для локальной машины и CI (`db:generate`, скрипты); через пул Supavisor (transaction, порт 6543): `prepare: false`, одно соединение, вне локальной машины TLS с проверкой сертификата (`verify-full`; свой центр сертификации — `DATABASE_CA_CERT`). В проекте с закрытым портом базы (сетевые ограничения Supabase действуют и на пулер) приложение на Vercel к базе напрямую не ходит: серверные задачи без сессии пользователя (плановые, импорт) пишут через `createAdminClient()` (`src/shared/infrastructure/supabase/admin.ts`, секретный ключ `SUPABASE_SECRET_KEY`, линтер пускает только `*.admin.ts` в инфраструктуре модуля; маршрут `src/app/api/cron` зовёт `server.ts` модуля); такая запись идёт мимо RLS и без `auth.uid()` — журнал должен получать актора системы явно (скил `dev-kit:supabase-rls-drizzle`).
- Ссылка на `auth.users` — `on delete restrict`, не `cascade`: удаление пользователя не стирает финансовые строки и автора в журнале. На аудируемой таблице — `before truncate … execute function audit.forbid_truncate()`: `truncate` обходит построчный журнал (образец — `*_notes_sample_hardening.sql`, pgTAP `004`).
- Журнал `audit.log` защищён триггером от правки, удаления и очистки через SQL-редактор и `db()`; от владельца, который снимет триггер (`disable trigger`, `session_replication_role`), он не защищён — это уровень доступа к панели Supabase, а не кода.
- Образец таблицы, индекса, прав и политик — `supabase/migrations/20260101000000_notes.sql`, pgTAP — `supabase/tests/001-notes-rls.sql`, репозиторий — `src/modules/notes/infrastructure/notes-repository.supabase.ts`; после удаления примера (B00-T03) образцы — в скилах `dev-kit:supabase-rls-drizzle` и `dev-kit:money-decimal` и в истории git (`git log --diff-filter=D --name-only -- src/modules/notes`).
- Каждая таблица с данными пользователя, кроме политик владельца: ограничивающая политика второго фактора `as restrictive for all to authenticated using ((select private.mfa_ok())) with check ((select private.mfa_ok()))` и триггер журнала `after insert or update or delete … for each row execute function audit.record()` (образцы — `*_second_factor_policies.sql`, `*_audit_log.sql`). Схемы `private` и `audit` в Data API не открываются.
- pgTAP: `tests.authenticate_as('alice', 'aal2')` — сессия со вторым фактором, `tests.add_verified_totp('alice')` — подтверждённый TOTP. Хелперы остаются в базе после `supabase test db`, поэтому команда — только локально (не `--remote`).
- Деньги: суммы в валюте `numeric(18,2)` рядом с колонкой `currency`; количества (акции, монеты), цены и курсы — `numeric` без ограничения масштаба (или `numeric(38,18)`: у токенов до 18 знаков, у обратных курсов и мелких цен значимые цифры дальше десятого знака; курс хранится в направлении источника, обратный считается в приложении); доли владения `numeric(12,10)`. При записи в колонку с масштабом Postgres округляет сам, от нуля (2.665 → 2.67, приложение к чётному дало бы 2.66; pgTAP `005`): значение с лишними знаками отклоняется в Zod (`parseDecimalInput`) или округляется явно до записи, базе округление не доверяется. На каждой денежной колонке `check (amount <> 'NaN'::numeric and abs(amount) <> 'Infinity'::numeric)` (образец — `*_notes_amount_finite.sql`; у колонки с масштабом бесконечность и так отвергается типом, у `numeric` без ограничения — только этой проверкой). supabase-js отдаёт `numeric` числом JavaScript, поэтому денежные колонки выбираются текстом (`amount::text`, образец — `notes-repository.supabase.ts`), функции базы возвращают деньги `text`, а пишутся строкой (`insert({ amount: value })`, где `value` — строка из `Decimal.toFixed()`; PostgREST принимает её как `numeric`). `npm run db:types` помечает `numeric`-колонки в `types.ts` типом `string`, так что число туда не передать; забытый `::text` компилятор не ловит — ловит Zod-схема строки в репозитории. PostgREST отдаёт не больше `max_rows` (1000) строк без ошибки: суммы и итоги считаются в SQL, списки — страницами.
- Строка поиска — с пределом длины.
- Типы колонок: `uuid default gen_random_uuid()`; момент — `timestamptz` (UTC), не `timestamp`; учётный период и дата без времени (месяц отчёта, дата закрытия) — `date`; `text` + `check (char_length(…) <= N)` вместо `varchar(N)`; `boolean not null default …`; перечисление — `text` + `check`, `enum` — только для устоявшихся наборов.

Подробно: скилы `dev-kit:supabase-rls-drizzle`, `dev-kit:money-decimal`; перед любым изменением базы — `postgres-best-practices:supabase-postgres-best-practices`.
