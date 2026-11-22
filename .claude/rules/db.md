---
paths:
  - 'src/shared/infrastructure/supabase/**'
  - 'src/modules/**/infrastructure/**'
  - 'supabase/**'
---

# База данных: API, миграции, функции

- Источник правды — миграции `supabase/migrations/<timestamp>_name.sql`: таблицы, политики, триггеры и права пишутся на SQL, копии схемы в коде нет.
- Приложение работает с базой только через API Supabase (HTTPS), прямого SQL-подключения в нём нет: запрос мимо API идёт мимо RLS, а порт Postgres в облачном проекте закрывают сетевыми ограничениями (они действуют и на пулер Supavisor; `docs/release.md`). Данные пользователя — `createClient()` (`src/shared/infrastructure/supabase/server.ts`) с его сессией. Серверные задачи без сессии (плановые, импорт) — `createAdminClient()`, где он разрешён — `security.md`; такая запись идёт мимо RLS и без `auth.uid()` — журнал должен получать актора системы явно (скил `dev-kit:supabase-rls`). Типы строк — из сгенерированного `types.ts`; запись в несколько таблиц одной транзакцией — функция базы через `rpc` (образец ниже). Напрямую к базе подключаются только скрипты и тесты локальной машины и CI (`npm run db:types`, `npm run seed:test-user`, `seedOwnedRows` в `tests/e2e/support/users.ts` — 50 тыс. строк для `npm run perf`; пакет `postgres` — в devDependencies): адрес локальной базы им передаёт `scripts/with-local-supabase.mjs` из `supabase status`, в переменных приложения его нет.
- Прямой SQL-клиент в приложении (построитель запросов, ORM) — только решением D-NNN, когда появится запрос, который нельзя выразить через API и функцию базы: клиент — в `src/shared/infrastructure` с тем же запретом линтера, что у `createAdminClient()` (он тоже обходит RLS): `local/direct-database` снимается только для его файла, а путь к нему, сырой SQL (`sql.raw`, `sql.unsafe`) и адрес базы в `env` закрываются заново, как было до удаления Drizzle из шаблона; соединение — через пул Supavisor (transaction, порт 6543, без подготовленных запросов; при закрытом порте его открывают для адресов Vercel), вне локальной машины TLS с проверкой сертификата; схема для него снимается с живой базы интроспекцией и сверяется в CI, а не пишется руками второй копией таблиц.
- Миграцию, уже слитую в `main`, не правят и не удаляют: она выложена на staging, правка разведёт базу и историю миграций. Исправление — новой миграцией вперёд; CI (`db.yml`, шаг «Merged migrations are not changed») это проверяет.
- Новая миграция — `npm run db:new <имя>` (`scripts/db-new.mjs`): создаёт файл и вписывает в начало `set lock_timeout = '5s';` и `set statement_timeout = '60s';` (перенос данных — больше, явно) — миграция не ждёт блокировку бесконечно и не вешает приложение; голый `supabase migration new` в оболочке Claude Code ждёт ввод и зависает. Применить локально — `supabase migration up` (только новые файлы, данные остаются; `supabase db reset` пересоздаёт базу целиком), затем `npm run db:types` и `supabase test db`. Перед остановкой задачи с миграцией — `npm run db:check-migrations` (Squawk: блокировки, удаление колонок, `int` вместо `bigint`) и `supabase db lint` (ошибки в функциях базы). Осознанное исключение — `-- squawk-ignore <правило>` перед оператором и строка D-NNN с причиной.
- Data API закрыт по умолчанию: новая таблица, счётчик и функция в `public` не получают прав `anon` и `authenticated` (pgTAP `006`). Таблицы и счётчики закрывает `*_default_privileges.sql`, функции — `*_functions_closed_by_default.sql`: право PUBLIC на функции глобальное, и снимает его только `alter default privileges for role postgres revoke execute on functions from public` без `in schema` (форма `in schema public` из первой миграции на функции не действует). Миграция таблицы сама выдаёт `grant` роли `authenticated` только на операции, у которых есть политика; `anon` — ничего. `select` и `delete` выдаются на таблицу, `insert` и `update` — по колонкам: `grant insert (…)` на то, что вводит пользователь, `grant update (…)` на то, что он вправе менять. `id`, время создания и другие служебные значения ставит база (значение по умолчанию или `before`-триггер), владелец после вставки не меняется. Табличный `grant insert, update` даёт через Data API задать время задним числом и подменить служебные колонки, а `revoke update (колонка)` после табличного `grant` не действует (образец — `*_notes_column_grants.sql`, pgTAP `004`). Закрытие функций действует в любой схеме: функции, которую от имени пользователя зовёт политика, представление или значение по умолчанию (как `private.mfa_ok()`), нужен явный `grant execute … to authenticated`.
- Функция для `rpc` (несколько таблиц одной транзакцией, запись от имени системы) лежит в `public` — остальные схемы в Data API не открыты. `security definer` обходит RLS, поэтому право проверяет сама функция, первым делом; имена в теле — со схемой; деньги возвращаются `text`; права выдаются явно, только вошедшему. Если права владельца не нужны — без `security definer`: тогда внутри действуют RLS и права вызывающего. Забытую проверку ловит общий pgTAP `900`: в теле каждой `security definer` функции `public`, доступной `authenticated`, должны быть вызовы `auth.uid()` и `private.mfa_ok()` (комментарии и строковые литералы не считаются; исключение — ключ `rpc_checks` с D-NNN); `supabase db advisors` такую функцию не замечает. Что право на объект проверено верно, `900` не видит — это pgTAP самой функции: аноним — `42501`, чужой — отказ, сессия без второго фактора — отказ, свой — результат.

  ```sql
  create function public.close_period(period_id uuid)
  returns void
  language plpgsql
  security definer
  set search_path = ''
  as $$
  begin
    if (select auth.uid()) is null or not (select private.mfa_ok()) then
      raise exception 'access denied' using errcode = 'insufficient_privilege';
    end if;
    -- object access (owner, permissions table) is checked here too, before the first write
  end;
  $$;
  revoke execute on function public.close_period(uuid) from public, anon;
  grant execute on function public.close_period(uuid) to authenticated;
  ```

- После правки `supabase/config.toml` локальный стек перезапускается — `supabase stop && supabase start`: `supabase db reset` пересоздаёт базу, но настройки Auth (пароль, сессии, MFA, лимиты) не перечитывает, и локальный e2e идёт на прежней конфигурации — ошибка всплывает только в CI.
- После миграции — `npm run db:types`: `src/shared/infrastructure/supabase/types.ts` генерируется из локальной базы и руками не правится; CI (`db.yml`) падает, если файл не совпадает с миграциями.
- Строка поиска — с пределом длины.

Таблицы, журнал, соглашения `900` и pgTAP — `db-tables.md`; деньги и повтор записи — `db-money.md`.

Подробно: скил `dev-kit:supabase-rls`; перед любым изменением базы — `postgres-best-practices:supabase-postgres-best-practices`.
