# Changelog шаблона

Что менялось в шаблоне. Проект, созданный раньше, переносит нужное руками и записывает это строкой D-NNN.

## 2026-11-10 — третья перепроверка: функции базы закрыты, линтер ловит ошибки денег и доступа, одно «готово», исполнимые задачи B00

- База: новая функция в `public` недоступна `anon` и `authenticated` (`*_functions_closed_by_default.sql`: `alter default privileges for role postgres revoke execute on functions from public`; функции, которую зовёт политика или клиент через `rpc`, нужен явный `grant execute`), pgTAP `006`; `audit.record()` берёт `row_id` из строки до изменения и запрещает смену `id` (`*_audit_record_identity.sql`, pgTAP `007`); общий pgTAP `900-table-conventions.sql` проверяет соглашения у каждой таблицы `public`, исключения — списком в самом тесте с номером D-NNN.
- Образец `notes`: `insert` и `update` — по колонкам (`*_notes_column_grants.sql`); валюта рядом с суммой без значения по умолчанию и ключ повтора `client_request_id` с `unique (owner_id, client_request_id)` (`*_notes_currency_and_request_id.sql`); форма создаёт ключ в обработчике отправки и показывает ошибку сервера у самой формы; e2e «ответ потерян, форма отправлена снова».
- Деньги: `formatMoney` требует валюту (значения «€» по умолчанию нет); `isIsoCurrency`, `currencyFractionDigits` (`src/shared/domain/currency.ts`) и `exceedsCurrencyPrecision` (`money.ts`) — 100,50 для JPY отклоняется; `npm run db:types` оставляет `numeric` в `Row` числом и делает строкой в `Insert` и `Update` — забытый `::text` стал ошибкой компилятора, `numeric` с `null` больше не роняет скрипт.
- Линтер: защиты `local/*` — сумма числом, операторы на `Money`, чистое ядро, Server Action мимо `authActionClient`, `verifySession` и `actionClient` вне модуля `auth`, свой клиент базы, ответ Supabase без проверки `error`, непроверенный `Result`, `throw` в use case, плановая задача без секрета, `enum`; защиты не отключаются комментарием; `npm run lint:rules` (в `check` и CI) — самопроверка на пробах `tests/lint-rules/fixtures`. Меньше шума на хорошем коде: числа в объектах, остаток деструктуризации, `||` у строк, `tabIndex` с `role="region"`, ссылка `// D-NNN: …`. `date-fns` убран из пакетов ядра.
- Плановые задачи: `isCronRequest` (`src/shared/lib/cron.ts`) сверяет `Authorization: Bearer …` с `CRON_SECRET` за постоянное время и отказывает, пока секрет не задан.
- Генератор модуля: список читает данные через `requireVerifiedSession()`, заголовок страницы — «Название раздела».
- Вход и доступ: `src/proxy.ts` и `src/shared/lib/session.ts` под unit-тестами по таблице состояний сессии с порогом покрытия 100 % — снятая проверка сессии или шага второго фактора даёт красный тест; matcher пропускает мимо proxy только `_next/static/`, `_next/image` и файлы-картинки верхнего уровня; JSON-отказ `/api/*` несёт обновлённые cookies; `verifiedSessionOrResponse()` — проверка сессии для Route Handlers (401 или 403 без редиректа, тела — `api-denial.ts`); e2e «украденный пароль»: сессия `aal1` не может снять фактор, сменить пароль или почту, подключить новый фактор напрямую в Supabase Auth.
- Наблюдение: Sentry не собирает данные запроса (`dataCollection` выключен целиком, `beforeSend` убирает `event.user`), тест сверяет исходящий конверт на настоящем `Sentry.init`; Server Action дольше секунды пишет строку `{ "type": "slow-action", "durationMs" }`.
- Качество экрана: проверки вынесены в `checkPageQuality` (`tests/e2e/support/page-quality.ts`) и идут и на странице с данными (`notes-quality.spec.ts`: сумма из 16 цифр, заголовок в 200 символов) — добавлены «содержимое не обрезано контейнером» и перенос на 320 px; CSP сверяется целиком, директива за директивой; вёрстка образца `notes` исправлена.
- Команды: `npm run gate` — одно «готово» задачи (`check`, проверки базы, весь e2e); `npm run db:new <имя>` — миграция без зависания и сразу с таймаутами; `npm run budget` — страница без скриптов, маршрут без записи в базе и запись без маршрута — ошибка, `--source manifest` для приложения, где все страницы рендерятся на запрос.
- Зависимости: install-скрипты запрещены (`allowScripts` в `package.json`, `strict-allow-scripts` в `.npmrc`), версии моложе трёх дней не ставятся (`min-release-age=3`), `check-lock.mjs` — на npm 11.19.0.
- CI и выкладка: браузеры Playwright из кэша, e2e не ждёт задания `quality`; `deploy-db.yml` сверяет сетевые ограничения с эталоном `SUPABASE_DB_ALLOWED_CIDRS` и возвращает к нему, адрес раннера подтверждают два сервиса, секреты — только в шагах.
- Claude Code: плагин `dev-kit` — только на уровне пользователя (объявление убрано из `.claude/settings.json`); запрет чтения `.vercel/**` и `supabase/.env*`; `next dev` не создаёт `AGENTS.md` (`agentRules: false`); `with-local-supabase.mjs` подсказывает `SUPABASE_PROJECT_ID` для клона, `seed:test-user` берёт пользователя и из переменных окружения.
- Документы: `CLAUDE.md` — «готово» = `npm run gate`, PR блока остаётся draft до «Ready for review» человека, документация установленного Next, оговорка «запрет чтения защищает от случайности»; B00 — проверки посреди блока по preview-ссылке PR и список «После слияния блока» в README блока; B00-T07 (nonce: `instant = false`, замена предохранителя `<Suspense>`, nonce в `ThemeProvider`, бюджет по манифестам), B00-T01 и T04 (ветки окружений GitHub, токен Supabase на проект, выпуск в production подтверждает сам разработчик, запрет удаления `main` и `production`, ключ подписи JWT ES256, решение о приглашении пользователя; `CODEOWNERS` с обязательным ревью — когда появится второй разработчик), B00-T03 (какие pgTAP остаются, база бюджета); `release.md` — те же настройки, `CRON_SECRET`, `db:new`; правила `ui.md`, `security.md`, `tests.md`, `docs.md`; заготовки блока и PR — «Итог» как единственный текст результата.
- По итогам независимого ревью PR: тот же ключ повтора с другими данными — отказ у формы, а не «сохранено» со старой суммой (`savedAsSubmitted` в `create-note.ts`, `violatesUniqueConstraint` сверяет имя ограничения); ошибки базы и Auth — операцией и кодом, без текста провайдера (`databaseError`, `authError`, `local/error-by-code`); Sentry не получает строки `console`.
- Линтер после ревью: отключить защиту комментарием нельзя ни `eslint-disable`, ни `/* eslint правило: "off" */` (`no-use`), а обход с отключением самих этих проверок ловит второй проход `npm run lint:rules` по `src` без учёта комментариев; новые правила `local/action-client`, `local/dynamic-import`, `local/no-unchecked-response`; плановая задача — проверка секрета первым оператором; защиты доступа действуют и в `src/shared/ui`; `amount: number | null`; самопроверка видит снятие запрета обхода RLS, `decimal.js`, `process.env` и областей правил.
- База после ревью: pgTAP `002` (второй фактор) и `003` (журнал) работают на своих таблицах и остаются после удаления примера — удаляются только `001`, `004`, `005`; `900` проверяет `security definer` функции для `authenticated` (вызовы `auth.uid()` и `private.mfa_ok()` в теле), колоночные права на служебные колонки и домены над `numeric`; исключение может назвать `таблица.колонка`; `npm run db:types` не пропускает молча таблицу в кавычках, `numeric[]` и функции с `numeric`.
- Поставка после ревью: npm не ниже 11.19 — `engines.npm` и `engine-strict` (более старый npm останавливает установку, а не выполняет install-скрипты); Claude Code не запускает `supabase migration up`, `test db`, `db lint`, `db advisors` с `--remote`, `--linked`, `--db-url`; `deploy-db.yml` — только ветки (не теги) `main` и `production`, открытый порт при `SUPABASE_NETWORK_RESTRICTED=true` — ошибка, возврат ограничений с повтором.
- Проекту, созданному раньше: миграции `*_functions_closed_by_default.sql` и `*_audit_record_identity.sql` и pgTAP `006`, `007`, `900` перенести первыми; `006` покажет функции `public`, которые остались открытыми анониму, — закрыть их явным `revoke execute … from public, anon`.

## 2026-11-09 — вторая перепроверка перед стартом: второй фактор без обхода, честный CSP, деньги по валюте, клиент для серверных задач

- Второй фактор: в production без `AUTH_REQUIRE_MFA` он обязателен (fail-closed, `env.ts`); `requireVerifiedSession()` (`session.ts`) для страниц за входом — редирект на шаг второго фактора, не только в `proxy.ts`; ошибка Supabase Auth при чтении факторов (бан, отозванная сессия) → `/login`, не 500 (`assurance.ts`, `proxy.ts`); `max_enrolled_factors = 1` в `config.toml`.
- Неудачные входы и неверные коды: `reportAuthFailure` (`monitoring.ts`) — строка `{ "type": "auth-failure", "code" }` из шлюзов `auth`, событие Sentry `auth-failure` только при срабатывании лимита Supabase Auth (`too-many-*`), чтобы подбор не сжигал квоту событий; Sentry `beforeSend` убирает заголовки, cookies, тело и query запроса, `dataCollection.urlQueryParams = false`. `setupActionClient` и страница `/mfa/setup` отказывают пользователю с подтверждённым фактором (при `max_enrolled_factors = 1` иначе была бы «неожиданная ошибка»). Ошибка Supabase Auth при чтении факторов, кроме 401/403, попадает в лог и Sentry.
- CSP (`next.config.ts`): `default-src 'self'`, `script-src 'self' 'unsafe-inline'` (в dev плюс `'unsafe-eval'`), `style-src 'self' 'unsafe-inline'`, `img-src 'self' blob: data:`, `font-src 'self'`, `connect-src 'self'`, `form-action 'self'`, `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`. Утверждение «строгий `script-src` через SRI без nonce» снято: спайк показал 9 инлайн-скриптов App Router на каждой странице, которые SRI не покрывает, а nonce требует динамического рендеринга каждой страницы — варианты и измерения в B00-T07. `ui-quality.spec.ts` проверяет заголовок и отсутствие нарушений CSP на каждой странице; `/mfa/setup` проверяется под пользователем без фактора (`carol` в `auth.setup.ts`), пользователя с фактором экран уводит на главную (`mfa.spec.ts`).
- Деньги: `formatMoney` берёт число знаков у валюты (EUR 2, KRW и JPY 0; тикер — до 8), без явного `fractionDigits` копейки не теряются; символы `'symbol'` (`CA$`, `CN¥`) вместо `narrowSymbol`; `money()` отвергает `NaN` и бесконечность; тип `Money`; `parseDecimalInput` — целая часть до 16 цифр у фиата, до 2 у долей (`numeric(12,10)`) и до 20 у количеств, цен и курсов (`numeric(38,18)`), дробная до 18 (`SCALE.quantity`, `price`, `rate`), доля 10; `formatDay` отвергает несуществующую дату (`2026-02-29`). Образец `notes`: поле «Сумма» в форме через `parseDecimalInput`, `amount` в use case, репозитории и фейке, e2e «1 234,56 → €1 234,56»; миграция `*_notes_amount_finite.sql` (`check (amount <> 'NaN')`), pgTAP `005`: 16 цифр без потери, NaN и переполнение отвергнуты, Postgres округляет при записи от нуля (2.665 → 2.67).
- Серверные задачи без сессии: `createAdminClient()` (`src/shared/infrastructure/supabase/admin.ts`, `SUPABASE_SECRET_KEY`), линтер пускает его и `db()` только в `shared/infrastructure` и `*.admin.ts` (и по алиасу, и относительным путём; плановая задача зовёт `server.ts` модуля), а запрет `decimal.js` действует и там; `db()` — локально и в CI, на Vercel `DATABASE_URL` не задаётся (порт базы закрыт сетевыми ограничениями, они действуют и на пулер).
- Документы: `release.md` (переменные Vercel без `DATABASE_URL`, `GITLEAKS_LICENSE` в Dependabot secrets, токен при передаче, секрет Google в `deploy-db.yml`, `project_id` для `[remotes.production]`, правило Sentry `auth-failure`, откат до Pro, Vercel Cron только в production); B00-T01 (пустой репозиторий заказчика, политика Actions, reviewer production), B00-T03 (полный список удаляемого, `PUBLIC_PATHS`), B00-T04 (`[remotes.production]`, секрет Google, отзыв сессии до 15 минут), B00-T05 (без `DATABASE_URL`), B00-T07 (CSP: два варианта с измерениями); `CLAUDE.md` и шаблон PR — `req:check --strict` с первого блока продукта; правила `db.md` (масштабы `numeric` без ограничения для цен, курсов и количеств, округление при записи, `NaN`, `max_rows`), `security.md`, `architecture.md` (cron, `rpc`, кэш только для справочников), `ui.md`; README — `playwright install`, `seed:test-user`, путь в организацию заказчика.

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
