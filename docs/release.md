# Выпуск

Путь кода: локально → preview на каждый PR → staging → production. Production выпускает человек.

## Среды

| Среда      | Код                | База                | Для чего                             |
| ---------- | ------------------ | ------------------- | ------------------------------------ |
| Локально   | `npm run dev`      | `supabase start`    | разработка, тесты                    |
| Preview    | каждый PR (Vercel) | Supabase staging    | показать задачу по ссылке            |
| Staging    | ветка `main`       | Supabase staging    | проверка перед выпуском              |
| Production | ветка `production` | Supabase production | пользователи, только реальные данные |

## Настройка один раз

1. Два проекта Supabase: staging и production; в production включить PITR и выключить саморегистрацию.
2. Vercel: Settings → Environments → Production → Branch Tracking — ветка `production`; домен staging назначить на ветку `main`; переменные окружения задать отдельно для Preview и Production.
3. GitHub: защитить `main` и `production` (только PR, зелёный CI); Environment `production` с обязательным подтверждением.
4. Sentry подключить до первого выпуска в production. Логи — одна строка JSON на событие (`{ type, …, durationMs }`) через `console.info` / `console.error`, без персональных данных, сумм и токенов: так их читают Vercel и поиск по логам.

## Миграции

1. Локально: `supabase migration new <имя>` → SQL → `supabase test db` → PR (CI `db.yml` проверяет advisors и pgTAP).
2. После слияния в `main`: `supabase link --project-ref <staging>` и `supabase db push`, проверить staging.
3. Перед выпуском: `supabase link --project-ref <production>` и `supabase db push`. Миграция только добавляет (новые колонки и таблицы), удаление — отдельным выпуском, когда код старое уже не читает.

## Выпуск в production

PR `main → production` с описанием «что выходит» (блоки, требования), CI зелёный, миграции применены → слияние человеком → Vercel деплоит production.

## Откат

- Код — Vercel Instant Rollback на предыдущий деплой.
- База — новая миграция, исправляющая вперёд; авария с данными — восстановление PITR.
- Причина и вывод — строка D-NNN в `docs/knowledge/decisions.md`.
