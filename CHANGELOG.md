# Changelog шаблона

Что менялось в шаблоне. Проект, созданный раньше, переносит нужное руками и записывает это строкой D-NNN.

## 2026-11-09 — готовность к старту: второй фактор в e2e, безопасный образец таблицы, типы денег

- `AFTER_SIGN_IN_PATH` (`src/shared/domain/routes.ts`) вместо `/notes` в действиях входа и e2e; задача B00-T03 «Убрать пример notes» (нумерация B00 сдвинута: T04 Supabase … T09 Закрытие блока).
- e2e: `alice` и `bob` в setup подключают TOTP (`enrollTotp`, `submitTotpCode` в `support/users.ts`) — сессии `aal2`, сценарии работают при обязательном втором факторе в политиках базы.
- `setupActionClient`: подключить новый TOTP при неподтверждённом существующем нельзя (`FORBIDDEN`); `verifyTotpCode` на шаге `verify` берёт только подтверждённый фактор, `factorId` от клиента игнорируется — путь обхода второго фактора по украденному паролю закрыт на уровне приложения, не в расчёте на GoTrue.
- `db()`: TLS `verify-full` вне локальной машины (postgres.js для `require` не проверяет сертификат), `DATABASE_CA_CERT` для своего центра сертификации.
- Миграция-образец `*_notes_sample_hardening.sql`: `on delete restrict` на `auth.users`, запрет `truncate` (`audit.forbid_truncate`), pgTAP `004`; схема Drizzle — `restrict`.
- `npm run db:types` → `scripts/db-types.mjs`: `numeric`-колонки в `types.ts` типа `string` — сумму числом не передать.
- `npm run seed:test-user` и `npm run totp` — тестовый пользователь с TOTP для проверки экранов (`.env.test.local`), вместо Studio руками.
- `formatDay` для колонок `date` без сдвига часового пояса; `money` — свой конструктор Decimal (`clone`), глобальный не меняется.
- pgTAP-хелперы `tests.*` — `revoke execute … from public`, исполняемы `postgres`, ролям API — только `authenticate_as`, `get_supabase_uid` и `clear_authentication` (их тесты зовут уже под ролью `authenticated`).
- `.prettierignore` — папки документов заказчика; `.claude/settings.json` — разрешения на все команды проверок; `release.md` — «Если что-то упало», Free-план засыпает, preview для разработчика; B00 — предусловия (Team, Environments, `GITLEAKS_LICENSE`), Free без `[auth.sessions]`, Access после домена, словари в T08, `--strict` с первого блока продукта.

## 2026-11-09 — проверки базы, лицензий и покрытия сценариев

- Squawk 2.70.0 (`npm run db:check-migrations`, CI `db.yml`): новые миграции без опасных для живой базы операций; в начале миграции — `lock_timeout` и `statement_timeout`; `.squawk.toml` — миграция в транзакции, без требования `CONCURRENTLY`.
- `supabase db lint --fail-on warning` в CI: ошибки в функциях базы (plpgsql_check).
- `npm run licenses` (в `check` и CI): production-зависимости без GPL, AGPL, SSPL и неизвестных лицензий.
- Порог покрытия `application`: 100 % строк и функций, 95 % ветвей.
- B00-T07 (ныне T08): с next-intl — `react/jsx-no-literals`, текст интерфейса только из словарей.

## 2026-11-09 — правила стиля: ловушки нуля, React, директивы, тесты

- 0 как значение: `prefer-nullish-coalescing`, `prefer-optional-chain`, `strict-boolean-expressions` (числа — явное сравнение; строки разрешены), `react/jsx-no-leaked-render`.
- React: `no-array-index-key`, `button-has-type`. Логи: `no-console` (только `info`, `warn`, `error`).
- `eslint-disable` — с причиной после `--` (`@eslint-community/eslint-plugin-eslint-comments`), лишняя директива — ошибка (`reportUnusedDisableDirectives`).
- Явные ошибки логики из `sonarjs`: одинаковые ветки и условия, перезапись элемента, проигнорированный результат.
- Тесты: `@vitest/eslint-plugin` и `eslint-plugin-playwright` — без `.only`, безусловного `.skip`, `waitForTimeout`, с проверкой в каждом тесте и `await` у проверок.
- Код шаблона приведён к правилам: лог web-vitals в dev — `console.info` строкой JSON, явная проверка `error.code` в `mfa-gateway`.

## 2026-11-09 — слитые миграции неизменны

- `db.yml`: шаг «Merged migrations are not changed» — PR, который меняет или удаляет миграцию из `main`, красный; исправление — новой миграцией. Хук `protect.sh` спрашивает только про правки через Edit и Write, а CI ловит и правку из терминала. Правило — в `.claude/rules/db.md` и `docs/release.md`.

## 2026-11-09 — приёмка задачи и сверка с ТЗ (dev-kit 0.15)

- `CLAUDE.md`: задачу закрывает только «задача проверена», «ок» и «да» посреди проверки — нет; в конце задачи Claude напоминает эти слова; замечания — новый круг с разбором; перед любым планом — перечитать ТЗ, реестр и решения.
- Заготовка блока: у требования смысл и источник, у задачи — номера и критерии приёмки; шаблон PR — таблица «требование → чем проверено».
- Правки по независимой проверке 09.11, не попавшие в PR #27: папку плана в `.superpowers/sdd/` не удалять, `wip:` в шагах плана, `clickup.md` до B00, пустой коммит перед draft-PR в T01.

## 2026-11-09 — сверка процесса перед стартом проекта

- `CLAUDE.md`: Superpowers — после дизайна блока `README.md` и `tasks.md`, а не план на блок; план только у крупной задачи, без ожидания одобрения, вне блоков — `docs/plans/`; коммиты шагов `wip: BNN-TNN`; новая таблица или модуль по ходу плана — стоп и вопрос; после последнего шага — остаток пути задачи до стопа; ветка блока — в начале блока; `/code-review medium` явно.
- `lint:fix` с `--max-warnings=0`: хук после ответа Claude ловит предупреждения, как CI и lint-staged.
- `req:check` пропускает `docs/blocks/_template`; заготовка блока — `BNN`.
- e2e: основной сервер с `AUTH_REQUIRE_MFA=false`, даже если второй фактор включён в `.env.local`.
- B00: ветка и `clickup.md` до первой задачи; draft-PR в T01; обязательные проверки `main` по именам; ветка `production`, squash и merge commit; первая выкладка базы вручную после секретов окружений.
- `release.md`: preview и миграции; шаблон PR — `test:e2e:db` и проходы закрытия блока; README — первый модуль после разбиения ТЗ, ADR — `decisions/D-NNN.md`.

## 2026-11-09 — Supabase CLI 3

- CLI 3.0.0 в `ci.yml`, `db.yml`, `deploy-db.yml` и на машинах разработчиков (`brew upgrade supabase/tap/supabase`); обновлять вместе.
- `deploy-db.yml`: `supabase db push --yes --remote` (в CLI 3 без `--remote` команда идёт в локальную базу), сетевые ограничения — `--remote=<ref>` вместо `--project-ref`.
- `config.toml`: `[auth.email] enabled` и `[auth.sms] enabled` вместо устаревших `enable_signup` (новые регистрации по-прежнему закрывает `[auth] enable_signup = false`); `project_id` убран — локальные контейнеры называются по имени папки, проекты из шаблона на одной машине не делят базу.
- `--local` убран у `gen types` и `db advisors`: локальная база — цель по умолчанию; `types.ts` перегенерирован (CLI 3 добавляет `ComputedFields`).
- Проект, созданный раньше: те же правки, затем `supabase stop` до обновления CLI и `supabase start` после, `npm run db:types`.

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
