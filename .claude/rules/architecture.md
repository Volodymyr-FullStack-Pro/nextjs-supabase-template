---
paths:
  - 'src/**'
---

# Архитектура: модули и четыре слоя

- Код по доменам: `src/modules/<домен>/{domain,application,infrastructure,ui}` + `server.ts`; общее — `src/shared/{domain,infrastructure,lib,ui}`; `src/app` — только маршруты и Suspense. Новый модуль — `npm run new:module <модуль> <запись>` (например, `businesses business`: модуль во множественном числе, тип одной записи в единственном), не руками.
- Зависимости направлены внутрь: `domain` ← `application` ← `infrastructure`/`ui`; `server.ts` собирает use cases с реальными репозиториями. `domain` и `application` из npm берут только zod, decimal.js и date-fns. Чужой модуль доступен из `ui` и `app` только через его `server.ts` и `domain`; `application` и `infrastructure` чужие use cases не вызывают — агрегирующий модуль описывает свой порт и реализует его своим репозиторием поверх таблиц или представления. Линтер (`boundaries`) это проверяет; обходить через `eslint-disable` нельзя.
- Use case: `make<Действие>(deps)` → `(input, ctx) => Promise<Result<…>>`; ожидаемые ошибки — классы из `shared/domain/errors` через `err()`, неожиданные — исключением. Без ожидаемых ошибок use case возвращает значение напрямую.
- Порт (интерфейс репозитория или шлюза) живёт в `application`, реализация — в `infrastructure` (user-scoped клиент Supabase, RLS применяется), фейк `*.fake.ts` — рядом, для тестов use cases. Наружу из репозитория — модель домена (Zod-схема `parse` на границе), не строка таблицы.
- Action (`ui/actions.ts`) = контроллер: `authActionClient.inputSchema(Schema).action(…)` → use case → `fail(error)` при ошибке домена → `revalidatePath`/`revalidateTag`. Логики в action нет.
- Страница: статическая оболочка + `<Suspense>` вокруг всего, что читает сессию, cookies или `searchParams` (Cache Components). Справочные данные — `'use cache'` + `cacheLife` + `cacheTag`; cookies внутри `'use cache'` читать нельзя.
- Фоновые и плановые задачи: плановая — Route Handler `src/app/api/cron/<задача>/route.ts`, который проверяет `Authorization: Bearer <CRON_SECRET>` (секрет — в `env.ts`), вызывает use case из `server.ts` модуля (тот же код, что у экрана) и пишет итог одной строкой JSON; путь `/api/cron/` добавляется в публичные пути `src/proxy.ts` (сессии у расписания нет, защищает секрет); расписание — `crons` в `vercel.json`. Задача идемпотентна: повторный запуск за тот же период ничего не задваивает (уникальный ключ периода в базе). Работа после ответа пользователю — `after()` из `next/server`; долгая или массовая — очередь (Supabase Queues), когда понадобится.
- Barrel-файлов (`index.ts` с реэкспортом) нет: импорт по точному пути. Короткие импорты даёт `server.ts` как единственная точка входа модуля; порядок и группы импортов держит линтер (`simple-import-sort`).
- Модель и схема входа — в `domain` на Zod; одна схема на форму и action.

Подробно: скил `dev-kit:clean-layers`; производительность — `dev-kit:performance-budget`.
