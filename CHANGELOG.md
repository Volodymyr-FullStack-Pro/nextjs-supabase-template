# Changelog шаблона

Что менялось в шаблоне. Проект, созданный раньше, переносит нужное руками и записывает это строкой D-NNN.

## 2026-11-09 — прод, второй фактор, журнал, точные суммы, закрытие блока

- PR #21: последняя задача блока — «Закрытие блока» с полной проверкой по PR; B00 — вход со вторым фактором, регион и Sentry, CSP через SRI; без счётчиков «N из M».
- PR #22: `vercel.json` с `fra1`; Sentry только на сервере (`src/instrumentation.ts`, организация в регионе EU); `deploy-db.yml` — staging с `main`, production с подтверждением, временный доступ к порту при `SUPABASE_NETWORK_RESTRICTED=true`; e2e с локальным Supabase (`npm run test:e2e:db`, в CI тоже); строже вход; типы базы генерируются и сверяются в CI.
- PR #23: второй фактор (TOTP, `AUTH_REQUIRE_MFA`, `/mfa/setup`, `/mfa/verify`, `private.mfa_ok()`), журнал `audit.log` с триггером `audit.record()`.
- PR #24: суммы из базы текстом, точность по ролям (`SCALE`), тикеры, коды ошибок и словари `ui/messages.ts`, `DEFAULT_LOCALE`, `refresh()`.
- PR #25: полная проверка блока — `npm run test:e2e:db`; `audit.log` защищён от правки, удаления и очистки даже владельцем; 30 минут бездействия — с `jwt_expiry = 900`; выпуск `main → production` — merge commit; `ADDITIONAL_REDIRECT_URLS` для preview.

Перенос в проект, созданный раньше: миграции `2026110908184*` и `20261109120000` — новыми файлами; `src/shared/lib/{session,safe-action}.ts`, `src/proxy.ts`, `src/shared/domain/{mfa,money,decimal-input,errors}.ts` — целиком; `.github/workflows/{ci,db,deploy-db}.yml`; переменные окружения из `.env.example`.

## 2026-11-07 — версии и основа интерфейса

Node 24 (`.nvmrc`, `engines.node: 24.x`, `@types/node` 24): поддерживается Vercel, LTS до апреля 2028; Node 22 убран. Вместе с Node 24 везде npm 11: правило «lock-файл только через npm 10» больше не нужно, `check-lock.mjs` проверяет npm 11. TypeScript 6.0 (typescript-eslint поддерживает до 6.0; TypeScript 7 — после поддержки в typescript-eslint). React 19.3.1.

Интерфейс: встроенная палитра Tailwind закрыта, слоты `--gain`, `--loss`, `--warning`, `--chart-6/7`, шрифты `--font-body` / `--font-code`, обводка фокуса 2 px с контрастом ≥ 3:1, касание 44 px на сенсорных экранах, `prefers-reduced-motion`; `formatMoney` на Intl (неразрывные пробелы, локаль, знаки) и `parseDecimalInput`; `formatDate` с часовым поясом проекта, `date-fns` убран; Playwright в часовом поясе проекта; `ui-quality` проверяет, что тёмная тема включилась, размер касания на телефоне и отмечает места, где axe не смог проверить контраст. Линтер: jsx-a11y (набор strict), типовые правила для тестов (`no-floating-promises` ловит забытый `await`), пустой `catch` только с объяснением; Prettier сортирует классы Tailwind.

## 2026-11-07 — интерфейс и дизайн-система

Playwright: проекты `desktop` (Chrome 1440×900) и `mobile` (iPhone 15, Safari), скриншот при падении, локаль ru-RU; `tests/e2e/ui-quality.spec.ts` — доступность WCAG 2.2 AA через axe в обеих темах и проверка горизонтальной прокрутки; WebKit в CI. `docs/design/design-system.md` — место для выбора заказчика; линтер запрещает цвета значениями в коде. Правило `ui.md`: состояния экранов, касание 44 px, ширины 390 и 1440.

## 2026-11-07 — поставка (PR #12)

Дорожная карта со строкой «Сейчас», папка блока `docs/blocks/` с `README.md` и `tasks.md`, глоссарий, `docs/_scratch/` вне git, `docs/release.md`, шаблон описания PR, `req:check` в CI и по блокам, статусы требований без «в работе», ADR `decisions/D-NNN.md`, короткий `CLAUDE.md` с одной строкой «Готово».

## 2026-11-07 — архитектура и правила (PR #11)

Модули и четыре слоя с проверкой границ, бюджет производительности и Web Vitals, стиль кода без комментариев, типы на границе, сортировка импортов, нормализация ввода, `SubmitButton`, индексы под запросы, заголовки безопасности, `npm audit` в CI, вход только по приглашению, `npm run check`.

## 2026-11-06 — полный набор (PR #10)

shadcn/ui, sonner, next-themes, next-safe-action, react-hook-form, nuqs, date-fns, тесты компонентов, git-хуки, `typedRoutes`, `npm run db:types`.
