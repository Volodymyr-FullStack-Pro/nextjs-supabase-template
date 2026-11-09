# Supabase в этом шаблоне

- `migrations/` — SQL-миграции, источник правды для базы (таблицы, RLS, функции). Применяются `supabase db push` (облако) или при `supabase start` / `supabase db reset` (локально).
- `tests/` — pgTAP: `000-setup-tests-hooks.sql` создаёт хелперы `tests.create_supabase_user`, `tests.authenticate_as(имя, aal)` (по умолчанию `aal1`), `tests.add_verified_totp`, `tests.clear_authentication`; остальные файлы — по одному на таблицу/политику. Запуск: `supabase test db`.
- Схема Drizzle (`src/shared/infrastructure/db/schema.ts`) повторяет миграции и даёт типы коду; `npm run db:generate` строит SQL в `drizzle/` для сверки, в `supabase/migrations` его переносят руками, чтобы RLS и функции оставались в одном месте.

## Локально

```bash
supabase start       # Postgres, Auth, Studio на 54323 (настройки — supabase/config.toml, project_id поменять на имя проекта)
supabase status      # URL и ключи → .env.local
supabase test db     # pgTAP
supabase db advisors --local # проверки безопасности и производительности (RLS, security definer, search_path, индексы)
```

Требуется Supabase CLI: `brew install supabase/tap/supabase`.
