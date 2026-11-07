---
paths:
  - 'tests/**'
  - '**/*.test.ts'
  - '**/*.test.tsx'
  - '**/*.spec.ts'
  - 'supabase/tests/**'
  - 'src/**/*.fake.ts'
---

# Тесты

- Слои: `domain` и `application` — Vitest на фейках из `infrastructure/*.fake.ts` (без базы, `src/**/domain/**` — покрытие 100 %); клиентские компоненты — Vitest + Testing Library в jsdom (первая строка файла `*.test.tsx` — `// @vitest-environment jsdom`, DOM чистится сам, URL — `withNuqsTestingAdapter`); серверные страницы и сценарии — Playwright против production-сборки; каждая политика RLS — pgTAP с негативным случаем; внешние HTTP — MSW.
- Все тесты — в `tests/unit`, зеркалом `src`: `tests/unit/modules/<домен>/<use-case>.test.ts`. Рядом с кодом тесты не кладутся: импорт vitest и фейков нарушил бы границы слоёв.
- Правило домена или use case пишется вместе с тестом до реализации (красный → зелёный). Фейк репозитория повторяет семантику реальной реализации (фильтр по владельцу, поиск) и живёт рядом с ней.
- Имя теста: глагол в третьем лице, намерение, не реализация, коротко; без `should`, `tests`, `must`, `validates that`. `it('rejects an empty title')`, `it('lists only the notes of the current user')`. Контекст — на уровне файла (`describe` по имени функции); один тест — одно поведение; длинное имя — признак, что тест надо разделить.
- В тестах правил из спецификации номер требования стоит в имени теста (`it('excludes BTC from liquidity by setting (B03-AC-02)')` или номер из реестра `(P3)`), чтобы `req:check` видел трассировку; комментариев в коде нет.
- Базу, auth и время в интеграционных тестах не мокать (локальный Supabase); мокать только внешние HTTP-API.
- Перед «готово»: `npm run check` и `npm run test:e2e` (и `supabase test db` при изменениях базы). Красный тест, даже чужой, попадает в отчёт.

Подробно: скил `dev-kit:test-layers`.
