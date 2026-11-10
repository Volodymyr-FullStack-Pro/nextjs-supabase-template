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
- Пользователя сценария удаляет `deleteTestUser` (`tests/e2e/support/users.ts`): перед удалением он чистит таблицы, которые ссылаются на `auth.users` с `on delete restrict`. Список этих таблиц живёт только там — новая таблица с владельцем добавляет в него своё удаление, иначе `finally` сценариев входа (`auth.spec`, `mfa.spec`) падает.
- Проверки качества экрана — `checkPageQuality(path, { state, ready })` из `tests/e2e/support/page-quality.ts`: доступность в двух темах, CSP, горизонтальная прокрутка, ширина 320 px, содержимое, обрезанное контейнером, размер касания. Пустую страницу проверяет `tests/e2e/ui-quality.spec.ts`; сценарий модуля вызывает ту же функцию на странице с данными — сумма из 16 цифр, валюта с буквенным кодом, строка максимальной длины без пробелов (образец — `tests/e2e/notes-quality.spec.ts`).
- `src/proxy.ts` и `src/shared/lib/session.ts` — под unit-тестами по таблице состояний сессии (`tests/unit/shared/proxy.test.ts`, `session.test.ts`; фейк Supabase Auth — `tests/unit/support/supabase-auth.ts`), порог покрытия у них и у `api-denial.ts` — 100 %: новый публичный путь или шаг входа — строка в таблице.
- Образцы сценариев с деньгами: ввод «1 234,56», повтор отправки после потерянного ответа и отказ правила у формы — `tests/e2e/notes.spec.ts`; сумма из 16 цифр без округления — `tests/e2e/money.spec.ts`.
- pgTAP: хелперы `tests.*` зовёт роль `postgres`; ролям API доступны только `authenticate_as`, `get_supabase_uid` и `clear_authentication` — их тесты зовут уже под ролью `authenticated`; `supabase test db` — только на локальной базе (`--remote` оставит хелперы в облаке).
- pgTAP таблицы — про поведение её политик: свой видит и меняет, чужой нет, без второго фактора нет, аноним получает `42501` (образец — `supabase/tests/001-notes-rls.sql`). Соглашения — RLS, политика второго фактора, триггеры журнала и запрета `truncate`, права по колонкам, индексы внешних ключей, `NaN`, валюта рядом с суммой — у каждой таблицы `public` проверяет общий `supabase/tests/900-table-conventions.sql`: в тесте таблицы их не повторять. Осознанное исключение — строка в `convention_exceptions` в начале `900` с номером D-NNN (`.claude/rules/db.md`).
- Тестовый пользователь для ручной проверки экранов (Playwright MCP) — `npm run seed:test-user` по `.env.test.local` или по переменным окружения `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USER_TOTP_SECRET`, код второго фактора — `npm run totp -s`; после `supabase db reset` запустить сид снова.
- Пробы защит линтера — `tests/lint-rules/fixtures`, по тем же путям, что и код: строка с ошибкой помечена `// expect: <правило>`, файл без пометок — хороший код и обязан быть чистым. Локальное правило без пробы — ошибка `npm run lint:rules`. Проба обхода — `// expect-strict: <правило>`: срабатывание, которое обычный проход не видит (комментарий в файле отключил защиту), а строгий проход с `allowInlineConfig: false` обязан показать; тем же строгим проходом `lint:rules` проверяет весь `src`.
- «Готово» задачи — `npm run gate` целиком, не только новый файл (определение и оговорка для долгого e2e — `CLAUDE.md`).

Подробно: скил `dev-kit:test-layers`.
