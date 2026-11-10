# Supabase в этом шаблоне

- `migrations/` — SQL-миграции, источник правды для базы (таблицы, RLS, функции). Применяются `supabase db push --remote` (облако) или при `supabase start` / `supabase db reset` (локально).
- `tests/` — pgTAP: `000-setup-tests-hooks.sql` создаёт хелперы `tests.create_supabase_user`, `tests.authenticate_as(имя, aal)` (по умолчанию `aal1`), `tests.add_verified_totp`, `tests.clear_authentication`; `001`–`005` — таблица-пример `notes` (политики, второй фактор, журнал, защита служебных колонок и повтора, деньги); `006` (права по умолчанию, функции для анонима), `007` (связь записи с журналом) и `900` (соглашения каждой таблицы `public` по каталогу, исключения — списком в самом файле) от примера не зависят и остаются после его удаления. Запуск: `supabase test db`.
- Схема Drizzle (`src/shared/infrastructure/db/schema.ts`) повторяет миграции и даёт типы коду; `npm run db:generate` строит SQL в `drizzle/` для сверки, в `supabase/migrations` его переносят руками, чтобы RLS и функции оставались в одном месте.

## Локально

```bash
supabase start       # Postgres, Auth, Studio на 54323 (настройки — supabase/config.toml; контейнеры называются по имени папки, перед стартом другого проекта — supabase stop)
supabase status      # URL и ключи → .env.local
npm run db:new accounts   # новая миграция сразу с lock_timeout и statement_timeout
supabase migration up     # применить новые миграции к локальной базе (supabase db reset — пересоздать её целиком)
supabase test db     # pgTAP
supabase db advisors # проверки безопасности и производительности (RLS, security definer, search_path, индексы)
```

Требуется Supabase CLI 3 той же версии, что в `.github/workflows/db.yml`: `brew install supabase/tap/supabase`. Команды без `--remote` работают с локальной базой, с `--remote` — с привязанным облачным проектом.
