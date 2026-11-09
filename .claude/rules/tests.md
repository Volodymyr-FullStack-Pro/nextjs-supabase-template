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

Подробно: скил `dev-kit:test-layers`.
