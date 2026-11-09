# Supabase в этом шаблоне

- `migrations/` — SQL-миграции, источник правды для базы (таблицы, RLS, функции). Применяются `supabase db push --remote` (облако) или при `supabase start` / `supabase db reset` (локально).
- `tests/` — pgTAP: `000-setup-tests-hooks.sql` создаёт хелперы `tests.create_supabase_user`, `tests.authenticate_as(имя, aal)` (по умолчанию `aal1`), `tests.add_verified_totp`, `tests.clear_authentication`; остальные файлы — по одному на таблицу/политику. Запуск: `supabase test db`.
- Схема Drizzle (`src/shared/infrastructure/db/schema.ts`) повторяет миграции и даёт типы коду; `npm run db:generate` строит SQL в `drizzle/` для сверки, в `supabase/migrations` его переносят руками, чтобы RLS и функции оставались в одном месте.

## Локально

```bash
supabase start       # Postgres, Auth, Studio на 54323 (настройки — supabase/config.toml; контейнеры называются по имени папки, перед стартом другого проекта — supabase stop)
supabase status      # URL и ключи → .env.local
supabase test db     # pgTAP
supabase db advisors # проверки безопасности и производительности (RLS, security definer, search_path, индексы)
```

Требуется Supabase CLI 3 той же версии, что в `.github/workflows/db.yml`: `brew install supabase/tap/supabase`. Команды без `--remote` работают с локальной базой, с `--remote` — с привязанным облачным проектом.
