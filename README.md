# nextjs-supabase-template

Шаблон проекта: Next.js 16 (App Router, `src/`), Supabase (Auth, Postgres с RLS), Drizzle, строгий TypeScript (`@tsconfig/strictest`), shadcn/ui (Base UI, lucide-react, sonner, next-themes), next-safe-action + react-hook-form + Zod, nuqs, date-fns, ESLint 10, Prettier, knip, jscpd, Vitest + Testing Library, Playwright, pgTAP, lint-staged на коммите, GitHub Actions и настройки Claude Code с плагином `dev-kit`. С первого коммита `lint`, `typecheck`, `test`, `test:e2e` и `build` зелёные.

## Новый проект из шаблона

```bash
gh repo create <org>/<проект> --template Volodymyr-FullStack-Pro/nextjs-supabase-template --private --clone
cd <проект>
nvm use                      # Node 22 из .nvmrc
npm ci
cp .env.example .env.local   # заполнить из Supabase → Project Settings → API
supabase start               # локальный Supabase (нужен Supabase CLI); supabase status → ключи в .env.local
npm run dev
```

Затем: заменить `<Проект>` в `CLAUDE.md` и `docs/knowledge/`, записать первое решение в `docs/knowledge/decisions.md`, при работе с ClickUp — переименовать `.claude/rules/clickup.md.example` в `clickup.md` и заполнить.

## Команды

| Команда                           | Что делает                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start` | Next.js                                                                                       |
| `npm run lint`, `lint:fix`        | ESLint 10: правила Next.js, `strictTypeChecked`, Prettier (см. «Доступность»)                 |
| `npm run typecheck`               | `next typegen && tsc --noEmit` (типы маршрутов, напр. `LayoutProps`)                          |
| `npm run format`, `format:check`  | Prettier                                                                                      |
| `npm test`, `test:coverage`       | Vitest: unit и компоненты в jsdom (`tests/unit`, `*.test.ts[x]`); 100 % на `src/lib/money.ts` |
| `npm run test:e2e`                | Playwright против `next build && next start`                                                  |
| `npm run knip`                    | неиспользуемые файлы, экспорты, зависимости                                                   |
| `npm run jscpd`                   | дубли кода (порог 0 %)                                                                        |
| `npm run req:check`               | реестр требований заказчика: повторы номеров, статусы, требования без ссылки                  |
| `npm run db:generate`             | SQL из `src/db/schema.ts` в `drizzle/` для сверки с `supabase/migrations`                     |
| `npm run db:studio`               | Drizzle Studio                                                                                |
| `npm run db:types`                | типы supabase-js из локальной базы → `src/lib/supabase/types.ts`                              |
| `supabase test db`                | pgTAP-тесты RLS из `supabase/tests`                                                           |
| `supabase db advisors --local`    | проверки безопасности и производительности базы                                               |

## Что где лежит

- `src/app` — только маршруты и layout (`/`, `/login`, `/notes`, `error.tsx`, `global-error.tsx`, `not-found.tsx`).
- `src/features/<домен>` — `schema.ts` (Zod, общий для формы и action), `action.ts` (next-safe-action), компоненты домена (пример: `notes`, `auth`).
- `src/components/ui` — shadcn/ui (добавлять `npx shadcn@latest add <имя>`); `src/components/form` — `TextField` для форм на react-hook-form.
- `src/data` — слой доступа к данным: `server-only`, проверка сессии (`verifySession`), DTO наружу.
- `src/db` — схема Drizzle с политиками `pgPolicy` и прямое подключение `db()` для серверных задач (мимо RLS — осознанно).
- `src/lib` — `env.ts` (ленивое чтение переменных), `money.ts` (decimal.js, `formatMoney`), `safe-action.ts` (`actionClient`, `authActionClient`, `ActionError`), `supabase/` (клиенты `@supabase/ssr`).
- `src/proxy.ts` — обновление сессии и редирект неавторизованных; не единственная защита. Что proxy попал в сборку, проверяет e2e-тест.
- `supabase/migrations` — источник правды для базы; `supabase/tests` — pgTAP; `supabase/config.toml` — локальный стек (`supabase start`).
- `tests/unit`, `tests/e2e` — Vitest и Playwright.
- `.claude/` — `settings.json` (маркетплейс `claude-kit`, плагин `dev-kit`, запреты), `rules/` (правила по областям).
- `docs/knowledge` — статус, реестр требований заказчика (`requirements.md`), решения, открытые вопросы; `docs/roadmap.md` — спринты; `docs/superpowers` — спецификации и планы.
- `scripts/requirements-check.mjs` — проверка реестра требований (`npm run req:check`).
- `.github/workflows` — `ci.yml` (lint, typecheck, тесты, knip, jscpd, build, e2e, gitleaks, semgrep), `db.yml` (advisors + pgTAP при изменениях базы).

## Claude Code

В `.claude/settings.json` записаны маркетплейс `Volodymyr-FullStack-Pro/claude-kit` и плагин `dev-kit@claude-kit`: после доверия папке Claude Code предложит установить плагин (скилы по безопасности данных, RLS, деньгам, тестам, ревью; хуки форматирования, проверки типов и защиты `.env`/миграций; команды `/dev-kit:handoff`, `/dev-kit:resume`, `/dev-kit:clickup-card`). Правила проекта — в `.claude/rules/`, процесс — в `CLAUDE.md`.

## Формы, действия, уведомления, состояние

- **Server Action** = `authActionClient.inputSchema(Schema).action(async ({ parsedInput, ctx }) => …)`: сессия проверяется в middleware, вход — Zod, ошибка для пользователя — `throw new ActionError('…')`, остальное наружу уходит общей фразой. Публичные действия — `actionClient`.
- **Форма** = `useHookFormAction(action, zodResolver(Schema))` + `TextField`: та же Zod-схема на клиенте и сервере, ошибки полей под полем, ошибки сервера — `toast.error` (sonner), успех — `toast.success`.
- **Состояние в URL** = nuqs: `useQueryState` на клиенте, `createLoader` на сервере (`src/features/notes/search-params.ts`). Глобального стора нет: данные живут на сервере, фильтры — в URL, формы — локально; zustand добавляется только под доказанную нужду.
- **Тема** — класс `dark` через next-themes; **даты** — date-fns (`ru`); **иконки** — lucide-react.
- **Git-хуки** — simple-git-hooks ставит `pre-commit` при `npm ci`/`npm install` (`prepare`), lint-staged прогоняет eslint и prettier по изменённым файлам. Где нет `.git` (Docker, Vercel), установка хуков пропускается автоматически.

## Что добавлять по мере надобности

| Нужда                             | Что ставить                                                      |
| --------------------------------- | ---------------------------------------------------------------- |
| Графики                           | `npx shadcn@latest add chart` (Recharts)                         |
| Таблицы с сортировкой и фильтрами | `npx shadcn@latest add table` + `@tanstack/react-table`          |
| Несколько языков интерфейса       | `next-intl` (маршруты с локалью, словари, форматы чисел и дат)   |
| Ошибки в проде                    | `@sentry/nextjs` (нужен DSN проекта)                             |
| Клиентский стор                   | `zustand`; серверные данные на клиенте — `@tanstack/react-query` |
| Письма                            | `resend` + `react-email`                                         |

Если `npx shadcn add` падает с `EALLOWSCRIPTS` (настройка `allow-scripts` в вашем `~/.npmrc`), запустите с чистым пользовательским конфигом: `NPM_CONFIG_USERCONFIG=/dev/null npx shadcn@latest add <имя>`.

## Доступность

`eslint-plugin-jsx-a11y` целиком пока не ставится: его peer-зависимость — ESLint ≤ 9. Из `eslint-config-next` работают только шесть базовых правил a11y (alt у изображений, роли ARIA и т. п.). Остальное — ручная проверка по чеклисту `/web-design-guidelines` и Playwright-сценарии с клавиатурой; когда плагин поддержит ESLint 10 — добавить `jsx-a11y/strict` в `eslint.config.mjs`.
