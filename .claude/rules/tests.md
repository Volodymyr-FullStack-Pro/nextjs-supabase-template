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
- E2E — production-сборка на порту 3100 (`playwright.config.ts`); часовой пояс — `APP_TIME_ZONE` (`src/shared/domain/time.ts`), язык — `DEFAULT_LOCALE` (`src/shared/domain/locale.ts`, он же у `lang`, денег и дат). Страница после входа — `AFTER_SIGN_IN_PATH` (`src/shared/domain/routes.ts`), не строка `/notes`.
- Сценарии за входом — `npm run test:e2e:db` с локальным Supabase (так в CI): пользователи создаются через admin API (`tests/e2e/support/users.ts`), `alice` и `bob` в setup-проекте входят и подключают TOTP (`enrollTotp`) — их сессии `aal2`, поэтому сценарии работают и при обязательном втором факторе в политиках базы; без базы такие сценарии пропускаются (`test.skip(!hasDatabase, …)`). Ввод в форму до гидратации теряется — действие с проверкой результата в `expect(...).toPass()`. Код TOTP в тестах — `submitTotpCode` (otplib по секрету со страницы).
- pgTAP: хелперы `tests.*` зовёт роль `postgres`; ролям API доступны только `authenticate_as`, `get_supabase_uid` и `clear_authentication` — их тесты зовут уже под ролью `authenticated`; `supabase test db` — только на локальной базе (`--remote` оставит хелперы в облаке).
- Тестовый пользователь для ручной проверки экранов (Playwright MCP) — `npm run seed:test-user` по `.env.test.local`, код второго фактора — `npm run totp -s`; после `supabase db reset` запустить сид снова.

Подробно: скил `dev-kit:test-layers`.
