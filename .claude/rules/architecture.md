---
paths:
  - 'src/**'
---

# Архитектура: модули и четыре слоя

- Опорные файлы: `src/shared/domain/result.ts` (`ok`, `err`), `src/shared/domain/errors.ts`, `src/shared/lib/safe-action.ts` (`authActionClient`, `mfaActionClient` для экранов `/mfa/*`, `setupActionClient` — подключение TOTP, `actionClient`, `fail`); образец модуля целиком — `src/modules/notes`.
- Границы слоёв и пакеты, разрешённые `domain` и `application` (`zod`, `decimal.js`, `date-fns`), задаёт `boundaries` в `eslint.config.mjs`. Ошибка границ значит, что код не на своём месте: переложить, не `eslint-disable`.
- `generateMetadata` читает данные через `server.ts` модуля, как и страница.
- `domain` и `application` возвращают коды, не тексты: ошибка — `code` (у правила ещё `rule`), сообщение Zod — ключ (`NOTE_MESSAGE_KEYS`). Тексты — словарь `ui/messages.ts` модуля с `satisfies Record<ключ | код, string>`; общие коды — `src/shared/ui/form/messages.ts`; язык — `DEFAULT_LOCALE` (`src/shared/domain/locale.ts`).
- Язык внутреннего приложения — next-intl без маршрутизации по языку; сегмент `[locale]` — только для публичного сайта с поиском. При переезде на `[locale]` ссылки переходят на навигацию next-intl, словари не меняются.
- Плановая задача: `isCronRequest` в `src/shared/lib/cron.ts` и секрет `CRON_SECRET` в `src/shared/infrastructure/env.ts` заводятся с первой задачей; расписание — `crons` в `vercel.json`; упавший запуск Vercel Cron сам не повторяет, а на staging (preview-деплой ветки `main`) расписание не выполняется вовсе — задача идемпотентна по периоду и запускается руками или локально. Пишет задача через `createAdminClient()` из файла `*.admin.ts` (сессии пользователя нет), не через `db()`; внутренние пересчёты в базе — `pg_cron`. Открытые префиксы — `PUBLIC_PREFIXES` в `src/proxy.ts`. Долгая или массовая работа — Supabase Queues, когда понадобится.
- Сценарий, который пишет в таблицы двух модулей одной транзакцией, — функция базы, вызываемая через `rpc` из репозитория владеющего модуля (`db().transaction` в работающем приложении недоступен). Кэш `'use cache'` — только для справочников, одинаковых для всех пользователей; ничего, что выводится из строк пользователя (внутри `'use cache'` нет cookies, а значит нет и RLS).

Подробно: скил `dev-kit:clean-layers`; производительность — `dev-kit:performance-budget`.
