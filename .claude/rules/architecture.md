---
paths:
  - 'src/**'
---

# Архитектура: модули и четыре слоя

- Опорные файлы: `src/shared/domain/result.ts` (`ok`, `err`), `src/shared/domain/errors.ts`, `src/shared/lib/safe-action.ts` (`authActionClient`, `actionClient`, `fail`); образец модуля целиком — `src/modules/notes`.
- Границы слоёв и пакеты, разрешённые `domain` и `application` (`zod`, `decimal.js`, `date-fns`), задаёт `boundaries` в `eslint.config.mjs`. Ошибка границ значит, что код не на своём месте: переложить, не `eslint-disable`.
- `generateMetadata` читает данные через `server.ts` модуля, как и страница.
- Язык внутреннего приложения — next-intl без маршрутизации по языку; сегмент `[locale]` — только для публичного сайта с поиском. При переезде на `[locale]` ссылки переходят на навигацию next-intl, словари не меняются.
- Плановая задача: `isCronRequest` в `src/shared/lib/cron.ts` и секрет `CRON_SECRET` в `src/shared/infrastructure/env.ts` заводятся с первой задачей; расписание — `crons` в `vercel.json`; упавший запуск Vercel Cron сам не повторяет. Открытые префиксы — `PUBLIC_PREFIXES` в `src/proxy.ts`. Долгая или массовая работа — Supabase Queues, когда понадобится.

Подробно: скил `dev-kit:clean-layers`; производительность — `dev-kit:performance-budget`.
