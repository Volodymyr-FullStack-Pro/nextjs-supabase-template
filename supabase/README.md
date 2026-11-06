# Supabase в этом шаблоне

- `migrations/` — SQL-миграции, источник правды для базы (таблицы, RLS, функции). Применяются `supabase db push` (облако) или при `supabase start` / `supabase db reset` (локально).
- `tests/` — pgTAP: `000-setup-tests-hooks.sql` создаёт хелперы `tests.create_supabase_user`, `tests.authenticate_as`, `tests.clear_authentication`; остальные файлы — по одному на таблицу/политику. Запуск: `supabase test db`.
- Схема Drizzle (`src/db/schema.ts`) повторяет миграции и даёт типы коду; `npm run db:generate` строит SQL в `drizzle/` для сверки, в `supabase/migrations` его переносят руками, чтобы RLS и функции оставались в одном месте.

## Локально

```bash
supabase init        # один раз, если нет supabase/config.toml
supabase start       # Postgres, Auth, Studio на 54323
supabase status      # URL и ключи → .env.local
supabase test db     # pgTAP
supabase db advisors # проверки безопасности (RLS, security definer, search_path)
```

Требуется Supabase CLI: `brew install supabase/tap/supabase`.
