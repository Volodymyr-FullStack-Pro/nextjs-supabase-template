# Supabase в этом шаблоне

- `migrations/` — SQL-миграции, источник правды для базы (таблицы, RLS, функции). Применяются `supabase db push --remote` (облако) или при `supabase start` / `supabase db reset` (локально).
- `tests/` — pgTAP: `000-setup-tests-hooks.sql` создаёт хелперы `tests.create_supabase_user`, `tests.authenticate_as(имя, aal)` (по умолчанию `aal1`), `tests.add_verified_totp`, `tests.clear_authentication`; `001`, `004`, `005` — таблица-пример `notes` (политики владельца, защита служебных колонок и повтора, деньги) и удаляются вместе с ней; остальные от примера не зависят, создают свои таблицы внутри теста и остаются после его удаления: `002` (поведение `private.mfa_ok()` и политики второго фактора), `003` (журнал `audit.log`: автор, старое и новое значение, только дополнение, закрыт для `anon`, `authenticated` и `service_role`, запрет `truncate`), `006` (права по умолчанию, функции для анонима), `007` (связь записи с журналом) и `900` (соглашения каждой таблицы и функции `public` по каталогу, исключения — списком в самом файле). Запуск: `supabase test db`.
- Схема Drizzle (`src/shared/infrastructure/db/schema.ts`) повторяет миграции и даёт типы коду; `npm run db:generate` строит SQL в `drizzle/` для сверки, в `supabase/migrations` его переносят руками, чтобы RLS и функции оставались в одном месте.

## Локально

```bash
supabase start       # Postgres, Auth, Studio на 54323 (настройки — supabase/config.toml; контейнеры называются по имени папки, перед стартом другого проекта — supabase stop)
supabase status      # URL и ключи → .env.local
npm run db:new accounts   # новая миграция сразу с lock_timeout и statement_timeout
supabase migration up     # применить новые миграции к локальной базе (supabase db reset — пересоздать её целиком)
supabase stop && supabase start   # после правки supabase/config.toml: db reset настройки Auth не перечитывает
supabase test db     # pgTAP
supabase db advisors # проверки безопасности и производительности (RLS, security definer, search_path, индексы)
```

Требуется Supabase CLI 3 той же версии, что в `.github/workflows/db.yml`: `brew install supabase/tap/supabase`. Команды без `--remote` работают с локальной базой, с `--remote` — с привязанным облачным проектом.
