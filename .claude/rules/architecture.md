---
paths:
  - 'src/**'
---

# Архитектура: модули и четыре слоя

- Код по доменам: `src/modules/<домен>/{domain,application,infrastructure,ui}` + `server.ts`; общее — `src/shared/{domain,infrastructure,lib,ui}`; `src/app` — только маршруты и Suspense. Новый модуль — `npm run new:module <имя>`, не руками.
- Зависимости направлены внутрь: `domain` ← `application` ← `infrastructure`/`ui`; `server.ts` собирает use cases с реальными репозиториями. `domain` и `application` не импортируют React, Next, Supabase, Drizzle. Чужой модуль доступен только через его `server.ts` и `domain`. Линтер (`boundaries`) это проверяет; обходить через `eslint-disable` нельзя.
- Use case: `make<Действие>(deps)` → `(input, ctx) => Promise<Result<…>>`; ожидаемые ошибки — классы из `shared/domain/errors` через `err()`, неожиданные — исключением. Без ожидаемых ошибок use case возвращает значение напрямую.
- Порт (интерфейс репозитория или шлюза) живёт в `application`, реализация — в `infrastructure` (user-scoped клиент Supabase, RLS применяется), фейк `*.fake.ts` — рядом, для тестов use cases. Наружу из репозитория — модель домена (Zod-схема `parse` на границе), не строка таблицы.
- Action (`ui/actions.ts`) = контроллер: `authActionClient.inputSchema(Schema).action(…)` → use case → `fail(error)` при ошибке домена → `revalidatePath`/`revalidateTag`. Логики в action нет.
- Страница: статическая оболочка + `<Suspense>` вокруг всего, что читает сессию, cookies или `searchParams` (Cache Components). Справочные данные — `'use cache'` + `cacheLife` + `cacheTag`; cookies внутри `'use cache'` читать нельзя.
- Barrel-файлов (`index.ts` с реэкспортом) нет: импорт по точному пути.
- Модель и схема входа — в `domain` на Zod; одна схема на форму и action.

Подробно: скил `dev-kit:clean-layers`; производительность — `dev-kit:performance-budget`.
