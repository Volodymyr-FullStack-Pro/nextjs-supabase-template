---
paths:
  - 'src/db/**'
  - 'supabase/**'
  - 'drizzle.config.ts'
  - 'drizzle/**'
---

# База данных: Supabase, RLS, Drizzle, деньги

- Миграции — в `supabase/migrations/<timestamp>_name.sql` (источник правды). Схема Drizzle `src/db/schema.ts` повторяет их и даёт типы; `npm run db:generate` строит SQL в `drizzle/` только для сверки.
- Каждая новая таблица: `enable row level security` в той же миграции, отдельные политики на select / insert / update / delete, `to authenticated`, условие через `(select auth.uid())`, индекс на колонку политики.
- `security definer` — только с `set search_path = ''` и вне открытых схем; никакой авторизации по `user_metadata`.
- Деньги и доли: `numeric(18, 2)` / `numeric(12, 6)` в базе, в Drizzle `numeric()` как строка (`mode: 'number'` запрещён), расчёты через `decimal.js`, округление только на выводе.
- `update` и `delete` всегда с `where`.
- Пользовательские запросы — через клиент Supabase (RLS применяется); `db()` из `src/db` — прямое подключение мимо RLS, только для серверных задач.
- Новая политика без pgTAP-теста в `supabase/tests/` с негативным случаем не считается готовой; `supabase db advisors --local` без ошибок.

Подробно: скилы `dev-kit:supabase-rls-drizzle`, `dev-kit:money-decimal`.
