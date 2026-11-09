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

- Unit — только в `tests/unit` зеркалом `src`: `tests/unit/modules/<домен>/<use-case>.test.ts`.
- Компонент: первая строка `*.test.tsx` — `// @vitest-environment jsdom`; DOM чистится сам; URL — `withNuqsTestingAdapter`.
- Внешние HTTP-API — MSW, ставится вместе с первым внешним API.
- E2E — production-сборка на порту 3100 (`playwright.config.ts`); часовой пояс и локаль — `APP_TIME_ZONE`, `APP_LOCALE` из `src/shared/domain/time.ts`.
- Сценарии за входом — `npm run test:e2e:db` с локальным Supabase (так в CI): пользователи создаются через admin API (`tests/e2e/support/users.ts`), `alice` и `bob` входят в setup-проекте; без базы такие сценарии пропускаются (`test.skip(!hasDatabase, …)`). Ввод в форму до гидратации теряется — действие с проверкой результата в `expect(...).toPass()`.

Подробно: скил `dev-kit:test-layers`.
