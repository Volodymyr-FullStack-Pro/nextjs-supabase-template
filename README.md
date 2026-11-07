# nextjs-supabase-template

Шаблон проекта с готовой архитектурой, правилами и проверками: Next.js 16 (App Router, Cache Components, React Compiler), Supabase (Auth, Postgres с RLS), Drizzle, строгий TypeScript (`@tsconfig/strictest`), shadcn/ui, next-safe-action + react-hook-form + Zod, nuqs, date-fns, ESLint 10 с проверкой архитектурных границ, Prettier, knip, jscpd, Vitest + Testing Library, Playwright, Lighthouse CI, pgTAP, lint-staged, GitHub Actions и настройки Claude Code с плагином `dev-kit`. С первого коммита весь пайплайн зелёный.

## Новый проект из шаблона

```bash
gh repo create <org>/<проект> --template Volodymyr-FullStack-Pro/nextjs-supabase-template --private --clone
cd <проект>
nvm use                      # Node 22 из .nvmrc
npm ci                       # ставит зависимости и git-хуки
cp .env.example .env.local   # заполнить из Supabase → Project Settings → API
supabase start               # локальный Supabase (нужен Supabase CLI); supabase status → ключи в .env.local
npm run dev
```

Затем: заменить `<Проект>` в `CLAUDE.md` и `docs/knowledge/`, записать первое решение в `docs/knowledge/decisions.md`, завести первый модуль `npm run new:module <имя>`, при работе с ClickUp переименовать `.claude/rules/clickup.md.example` в `clickup.md`.

Безопасность: в Supabase выключить саморегистрацию (Authentication → «Allow new users to sign up» = off; пользователи заводятся приглашением), а если приложение закрыто Cloudflare Access — проверять его JWT в `proxy.ts` или закрыть `*.vercel.app`, иначе периметр обходится (`.claude/rules/security.md`). В репозитории включить оповещения Dependabot и автоматические security-PR (`gh api -X PUT repos/<org>/<проект>/vulnerability-alerts` и `.../automated-security-fixes`), защитить `main` (PR и зелёный CI обязательны). Версия Supabase CLI в `.github/workflows/db.yml` закреплена и должна совпадать с `supabase --version` на машинах разработчиков: обновлять обе вместе.

Для `/notes`, `npm run db:types` и pgTAP нужны Docker и Supabase CLI (`brew install supabase/tap/supabase`). Первого пользователя заведите в Studio (`http://127.0.0.1:54323` → Authentication → Add user) или через `supabase/seed.sql`.

## Архитектура: модули и четыре слоя

Код разложен по доменам (модулям), внутри модуля — по слоям. Правило одно: зависимости направлены внутрь, к чистому ядру; фреймворки и база — снаружи и заменяемы. Нарушение правила — ошибка `npm run lint`, а не замечание на ревью.

```
src/app/                         тонкие page/layout: только композиция и Suspense, никакой логики
src/modules/<домен>/
  domain/                        модели (Zod), чистые правила, ошибки домена. Без React, Next, Supabase, Drizzle
  application/                   use cases и интерфейсы репозиториев (порты)
  infrastructure/                реализации портов: Supabase/Drizzle, внешние API; *.fake.ts — для тестов
  ui/                            actions (next-safe-action → use case), формы, компоненты, search-params
  server.ts                      точка сборки: use cases с реальными репозиториями (единственный «DI»)
src/shared/
  domain/                        деньги (decimal.js), Result, ошибки домена
  infrastructure/                клиенты Supabase, схема Drizzle и прямое подключение, env
  lib/                           safe-action (actionClient, authActionClient, fail), session
  ui/                            shadcn/ui, form/TextField, sonner
src/proxy.ts                     обновление сессии и редиректы (не единственная защита)
```

| Слой             | Что в нём                 | Может импортировать                                                                                                           |
| ---------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `domain`         | модели, правила, ошибки   | свой `domain`, `shared/domain`, пакеты без I/O (zod, decimal.js)                                                              |
| `application`    | use cases, порты          | свой `domain` и `application`, `shared/domain`                                                                                |
| `infrastructure` | репозитории, шлюзы, фейки | свой `application` и `domain`, `shared/domain`, `shared/infrastructure`                                                       |
| `server.ts`      | сборка                    | свой `application`, `infrastructure`, `domain`, `shared/*` кроме `ui`                                                         |
| `ui`             | actions, компоненты       | свой `server.ts`, `domain`, `ui`; `shared/ui`, `shared/lib`, `shared/domain`; чужие модули — только их `server.ts` и `domain` |
| `app`            | маршруты                  | `modules/*/ui`, `modules/*/server.ts`, `modules/*/domain`, `shared/ui`, `shared/lib`, `shared/domain`                         |

`domain` и `application` из пакетов npm могут импортировать только `zod`, `decimal.js` и `date-fns` — всё остальное запрещено `eslint-plugin-boundaries` (конфигурация в `eslint.config.mjs`). Тесты живут в `tests/unit`, зеркалом `src`: рядом с кодом они нарушили бы границы. Barrel-файлы (`index.ts` с реэкспортом) не используются: импорт по точному пути, это быстрее собирается и лучше анализируется.

**Зачем так.** Правила денег и бизнеса живут в чистых функциях и проверяются тестами без базы и браузера; замена Supabase, Vercel или UI-библиотеки не трогает ядро; у каждой вещи одно место, и Claude Code не выбирает, «куда положить»; модуль можно вынести в пакет или другой сервис без переписывания.

### Как проходит запрос

1. **Чтение.** `page.tsx` рендерит статическую оболочку и оборачивает динамику в `<Suspense>`. Серверный компонент из `ui/` берёт сессию (`verifySession`) и вызывает use case из `server.ts`; use case ходит в порт, порт реализован на user-scoped клиенте Supabase (RLS применяется). Наружу уходит модель домена, не строка таблицы.
2. **Запись.** Форма (`useHookFormAction` + Zod-схема из `domain`) вызывает action из `ui/actions.ts`. `authActionClient` проверяет сессию в middleware и валидирует вход той же схемой; action вызывает use case, получает `Result`, при ошибке домена делает `fail(error)` (текст уходит пользователю), затем `revalidatePath`/`revalidateTag`.
3. **Ошибки.** Ожидаемые (`NotFoundError`, `ForbiddenError`, `ConflictError`, `RuleViolationError`) возвращаются из use case как `Result`. Неожиданные (сеть, база) бросаются и превращаются в общую фразу в `handleServerError`; причина попадает в лог и Sentry.
4. **Кэш.** Данные пользователя читаются динамически под Suspense. Справочники и редко меняющиеся данные — компоненты и функции с `'use cache'`, `cacheLife`, `cacheTag`; инвалидация — `updateTag(tag)` (или `revalidateTag(tag, 'max')`, в Next 16 второй аргумент обязателен) в action, который их меняет. Внутри `'use cache'` нельзя читать cookies и сессию.

### Новый модуль

```bash
npm run new:module businesses
```

Создаёт `src/modules/businesses/{domain,application,infrastructure,ui}`, `server.ts`, фейк репозитория, тесты домена и use case и страницу `src/app/businesses/page.tsx`. Всё проходит `npm run check` сразу; дальше описываете модель в `domain`, use cases в `application`, запросы в `infrastructure`. Action и форму генератор не создаёт: образец — `src/modules/notes/ui/actions.ts` и `notes-form.tsx`.

**Модули и чужие данные.** Из `ui` и `app` чужой модуль доступен через его `server.ts` (use cases) и `domain` (типы). Внутри `application` и `infrastructure` чужие use cases не вызываются: агрегирующий модуль (например, портфель, которому нужны бизнесы и инвестиции) описывает свой порт и реализует его своим репозиторием поверх таблиц или представления в базе. Так модули остаются независимыми, а агрегаты считаются там, где данные.

## Чистый код

Линтер держит код простым и читаемым, а правила и ревью — осмысленным: без комментариев (смысл в именах, структуре и тестах; разрешены только директивы инструментов), файл ≤ 300 строк (потолок; единую ответственность держат лимиты на функцию), функция ≤ 80 строк (компонент `.tsx` ≤ 120) и ≤ 3 параметров, сложность ≤ 10, без магических чисел, имена без сокращений и одиночных букв, kebab-case файлов, `eslint-disable` только с именем правила (проверяет линтер) и причиной в той же строке (проверяет ревью). Принципы DRY (на третьем повторе), KISS, YAGNI, честный TypeScript и неизменяемость — в `.claude/rules/code-style.md` и скиле `dev-kit:code-style`. Компоненты shadcn в `src/shared/ui` — сторонний код: к ним применяются только границы импортов. Корневые конфиги (`eslint.config.mjs`, `vitest.config.mts` и т. п.) и SQL могут содержать комментарии — правило «без комментариев» действует на `src`, `scripts` и `tests`.

**Типы, ввод, повторы.** `any` запрещён; `unknown` и `as` линтер допускает только там, где данные приходят извне (`infrastructure`, `shared/lib`, `app/api`, `proxy.ts`) и тут же проходят Zod. Текст пользователя нормализуется один раз в Zod-схеме `domain` (`normalizeText` из `src/shared/domain/text.ts`: NFC, без невидимых символов, схлопнутые пробелы), поиск — `normalizeSearch` в use case. Импорты сортирует и группирует линтер (`simple-import-sort`, `import/no-duplicates`, `consistent-type-imports`); barrel-файлов нет — короткие импорты даёт `server.ts` модуля. Формы отправляются через `SubmitButton` (блокировка, `aria-busy` и спиннер на время action); операции, которые пользователь может повторить, идемпотентны (`client_request_id`), индексы строятся под запросы списков — правила в `.claude/rules/db.md`. Базовые заголовки безопасности — в `next.config.ts`.

**Дизайн и качество интерфейса.** Выбор заказчика записывается в `docs/design/design-system.md`, значения — токенами в `src/app/globals.css`; цвет значением в коде ловит линтер. E2E идёт на компьютере (Chrome 1440×900) и на iPhone (Safari); `tests/e2e/ui-quality.spec.ts` проверяет доступность WCAG 2.2 AA (axe) в светлой и тёмной теме и отсутствие горизонтальной прокрутки. Порядок «варианты дизайна заказчику → выбор → код» — скил `dev-kit:design-system`.

## Производительность

Бюджет на маршрут: TTFB ≤ 200 мс с кэшем, LCP ≤ 1,5 с, TBT ≤ 200 мс, CLS ≤ 0,1, Lighthouse Performance ≥ 90, JavaScript начальной загрузки ≤ 300 КБ gzip. Проверки:

- **Лаборатория, на каждом PR:** Lighthouse (`lighthouserc.cjs`, `npm run perf`), `npm run budget` (сумма gzip-скриптов из HTML каждой страницы, без префетча; сравнивает с базой `perf-baseline.json` — рост даже внутри лимита красный, пока базу не обновили осознанно: `npm run budget -- --update-baseline` в том же PR с объяснением), e2e-замер TTFB главной, `npm run analyze` для разбора бандла.
- **Лимит — граница, не цель.** Цель каждой задачи — не ухудшить метрики, а при возможности улучшить; улучшение тоже фиксируется в базе.
- **Поле, в проде:** Web Vitals реальных пользователей (`src/app/web-vitals.tsx` → `/api/vitals`): LCP, INP, CLS, FCP, TTFB с оценкой good / needs-improvement / poor. Сейчас пишутся в лог структурированной строкой; в проекте подключить Sentry или аналитику в `src/app/api/vitals/route.ts`.

Точка отсчёта шаблона (Next 16 + React 19, без nomodule-полифилла): пустая страница ≈ 172 КБ gzip, главная с темой, уведомлениями, nuqs и Web Vitals ≈ 210, страница с формой (zod, react-hook-form, Base UI) ≈ 260. Текущие значения — в `perf-baseline.json`. Новый экран должен укладываться в бюджет: тяжёлые компоненты через `next/dynamic`, валидация на клиенте — только схемы из `domain`, серверные модули в клиент не импортировать.

Принципы: считать там, где данные (снимки и агрегаты в базе, индексы под фильтры, пагинация на сервере); кэш по умолчанию с точной инвалидацией по тегам; минимум JS в браузере (серверные компоненты, клиентские только листья, тяжёлое через `next/dynamic`, DTO вместо объектов целиком); мгновенный отклик (`useOptimistic`, `useTransition`, префетч, debounce); без водопадов (`Promise.all`, `React.cache` для дедупликации, `after()` для фоновой работы); один регион для приложения и базы.

## Тесты

| Слой                    | Инструмент                                                        | Что проверяем                                                     |
| ----------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `domain`, `application` | Vitest на фейках из `infrastructure/*.fake.ts`                    | правила и use cases без базы; `src/**/domain/**` — покрытие 100 % |
| клиентские компоненты   | Vitest + Testing Library в jsdom (`// @vitest-environment jsdom`) | поведение, доступность; URL — `withNuqsTestingAdapter`            |
| страницы и сценарии     | Playwright против production-сборки                               | серверные компоненты, формы, редиректы, TTFB                      |
| политики RLS            | pgTAP (`supabase test db`)                                        | свои строки видны, чужие нет                                      |
| внешние HTTP            | MSW (добавляется с первым внешним API)                            | ответы записаны, сеть не мокается на уровне функций               |

Имена тестов: начинаются с глагола в третьем лице и описывают намерение, не реализацию: `it('rejects an empty title')`, `it('lists only the notes of the current user')`. Без `should`, `tests`, `must`; контекст — в названии файла; один тест — одно поведение; в тестах правил домена номер требования из реестра — в имени теста (`(B03-AC-02)`).

## Команды

| Команда                                            | Что делает                                                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start`                  | Next.js                                                                                                         |
| `npm run check`                                    | всё, что проверяет CI, одной командой: lint, typecheck, test:coverage, knip, jscpd, format:check, build, budget |
| `npm run lint`, `lint:fix`                         | `next typegen` + ESLint 10: правила Next.js, `strictTypeChecked`, архитектурные границы, стиль кода, Prettier   |
| `npm run typecheck`                                | `next typegen && tsc --noEmit`                                                                                  |
| `npm run format`, `format:check`                   | Prettier                                                                                                        |
| `npm test`, `test:coverage`                        | Vitest: ядро и компоненты; 100 % на `src/**/domain/**`                                                          |
| `npm run test:e2e`                                 | Playwright против `next build && next start`                                                                    |
| `npm run perf`                                     | Lighthouse по бюджету из `lighthouserc.cjs` (после `npm run build`)                                             |
| `npm run analyze`                                  | сборка с анализатором бандла                                                                                    |
| `npm run knip`                                     | неиспользуемые файлы, экспорты, зависимости                                                                     |
| `npm run jscpd`                                    | дубли кода (порог 0 %)                                                                                          |
| `npm run req:check`                                | реестр требований заказчика: повторы номеров, статусы, требования без ссылки                                    |
| `npm run new:module <имя>`                         | каркас модуля по архитектуре                                                                                    |
| `npm run db:generate`                              | SQL из схемы Drizzle в `drizzle/` (папка в .gitignore) для сверки с `supabase/migrations`                       |
| `npm run db:types`                                 | типы supabase-js из локальной базы → `src/shared/infrastructure/supabase/types.ts`                              |
| `npm run db:studio`                                | Drizzle Studio                                                                                                  |
| `supabase test db`, `supabase db advisors --local` | pgTAP и проверки безопасности и производительности базы                                                         |

На коммите lint-staged прогоняет eslint и prettier по изменённым файлам (simple-git-hooks ставит хук при `npm ci`; без `.git` или без devDependencies установка молча пропускается).

Зависимости и lock-файл: CI и Vercel ставят пакеты npm 10 (Node 22), а локальный npm 11 пишет lock-файл иначе, и `npm ci` в CI падает с «package.json and package-lock.json are not in sync». Поэтому после любого изменения зависимостей: `npx npm@10 install --package-lock-only` и коммит lock-файла. На коммите lint-staged проверяет lock-файл сухим прогоном `npm@10 ci` (`scripts/check-lock.mjs`) и не даст закоммитить несовместимый.

## Что где лежит

- `src/app` — только маршруты, layout, `error.tsx`, `global-error.tsx`, `not-found.tsx`.
- `src/modules/<домен>` — см. «Архитектура». Пример: `notes` (полный цикл: модель, use cases, репозиторий, фейк, action, форма, поиск в URL, кэшируемые подсказки), `auth` (вход через порт `AuthGateway`).
- `src/shared/ui` — shadcn/ui: добавлять `npx shadcn@latest add <имя>` и сразу `npm run format`; к этим файлам применяются только границы и базовые правила Next; типозависимые и стилевые правила, `no-non-null-assertion`, `no-explicit-any` выключены (сторонний код); локальные правки: `field.tsx`, `sonner.tsx`, `card.tsx`. Свой код здесь — `form/text-field.tsx`, к нему правила применяются.
- `supabase/migrations` — источник правды для базы; `supabase/tests` — pgTAP; `supabase/config.toml` — локальный стек.
- `tests/unit` (зеркалит `src`), `tests/e2e`.
- `scripts/` — `new-module.mjs` (каркас модуля), `requirements-check.mjs` (реестр требований), `bundle-budget.mjs` (бюджет JS), `check-lock.mjs` (lock-файл для npm 10).
- `.claude/` — `settings.json` (маркетплейс `claude-kit`, плагин `dev-kit`, запреты), `rules/` (архитектура, безопасность, база, интерфейс, тесты, документация).
- `docs/knowledge` — статус, реестр требований заказчика (`requirements.md`), индекс решений (`decisions.md`) и ADR крупных решений (`decisions/D-NNN-*.md`), открытые вопросы; `docs/roadmap.md` и `docs/blocks/` — поставка: спринты, блоки, задачи; `docs/glossary.md` — понятия.
- `.github/workflows` — `ci.yml` (lint, typecheck, тесты, knip, jscpd, build, e2e, Lighthouse, gitleaks, Semgrep), `db.yml` (advisors + pgTAP при изменениях базы).

## Работа с Claude Code

Полное руководство по системе разработки (новая машина, новый проект, путь задачи, сессии и чистый контекст, на что смотреть, как улучшать) — [claude-kit/docs/GUIDE.md](https://github.com/Volodymyr-FullStack-Pro/claude-kit/blob/main/docs/GUIDE.md).

- В `.claude/settings.json` записаны маркетплейс `claude-kit` и плагин `dev-kit@claude-kit`: после доверия папке Claude Code предложит его установить. Состав плагина — README плагина.
- Правила проекта — `.claude/rules/*.md` (подключаются по путям файлов); путь задачи — `CLAUDE.md` и скил `dev-kit:delivery`; выпуск — [docs/release.md](docs/release.md).
- Ответы и решения заказчика — в реестр `docs/knowledge/requirements.md` в тот же день; задачи и тесты ссылаются на его номера; `npm run req:check` следит за трассировкой.

## Что добавлять по мере надобности

| Нужда                             | Что ставить                                                      |
| --------------------------------- | ---------------------------------------------------------------- |
| Графики                           | `npx shadcn@latest add chart` (Recharts)                         |
| Таблицы с сортировкой и фильтрами | `npx shadcn@latest add table` + `@tanstack/react-table`          |
| Несколько языков интерфейса       | `next-intl` (маршруты с локалью, словари, форматы чисел и дат)   |
| Ошибки в проде                    | `@sentry/nextjs` (нужен DSN проекта)                             |
| Внешние HTTP-API в тестах         | `msw`                                                            |
| Клиентский стор                   | `zustand`; серверные данные на клиенте — `@tanstack/react-query` |
| Письма                            | `resend` + `react-email`                                         |

Официальные компоненты shadcn импортируют `cn` из пакета `cn`; сторонним реестрам с `@/lib/utils` нужен файл `src/shared/lib/utils.ts` с `export { cn } from 'cn'`. Если `npx shadcn add` падает с `EALLOWSCRIPTS` (настройка `allow-scripts` в `~/.npmrc`), запустите с чистым пользовательским конфигом: `NPM_CONFIG_USERCONFIG=/dev/null npx shadcn@latest add <имя>`.

## Доступность

`eslint-plugin-jsx-a11y` целиком пока не ставится: его peer-зависимость — ESLint ≤ 9. Из `eslint-config-next` работают только шесть базовых правил a11y. Остальное — ручная проверка по чеклисту `/web-design-guidelines` и Playwright-сценарии с клавиатурой; когда плагин поддержит ESLint 10 — добавить `jsx-a11y/strict` в `eslint.config.mjs`.
