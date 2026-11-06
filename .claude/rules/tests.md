---
paths:
  - 'tests/**'
  - '**/*.test.ts'
  - '**/*.test.tsx'
  - '**/*.spec.ts'
  - 'supabase/tests/**'
---

# Тесты

- Три слоя: Vitest (`tests/unit`, `*.test.ts`) — логика, расчёты, валидация; Playwright (`tests/e2e`) — сценарии против production-сборки; pgTAP (`supabase/tests`) — каждая политика RLS с негативным случаем.
- Асинхронные серверные компоненты не тестируются Vitest — только E2E и unit-тесты их функций.
- Клиентские компоненты — Vitest + Testing Library в jsdom: первая строка файла `*.test.tsx` — `// @vitest-environment jsdom`; состояние URL подменяется `withNuqsTestingAdapter` (пример `tests/unit/notes-search.test.tsx`).
- Базу, auth и время в интеграционных тестах не мокать (локальный Supabase); мокать только внешние HTTP-API.
- Пакет денег (`src/lib/money.ts`) — покрытие 100 %, ожидаемые значения как строки.
- Тест называется поведением; один тест — одно поведение.
- Перед «готово»: `npm run lint && npm run typecheck && npm test && npm run test:e2e` (и `supabase test db` при изменениях базы). Красный тест, даже чужой, попадает в отчёт.

Подробно: скил `dev-kit:test-layers`.
