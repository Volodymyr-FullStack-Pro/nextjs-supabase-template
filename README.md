# nextjs-supabase-template

Шаблон проекта: Next.js 16 (App Router, `src/`), Supabase (Auth, Postgres с RLS), Drizzle, строгий TypeScript (`@tsconfig/strictest`), ESLint 10, Prettier, knip, jscpd, Vitest, Playwright, pgTAP, GitHub Actions и настройки Claude Code с плагином `dev-kit`. С первого коммита `lint`, `typecheck`, `test`, `test:e2e` и `build` зелёные.

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

| Команда                           | Что делает                                                                |
| --------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev` / `build` / `start` | Next.js                                                                   |
| `npm run lint`, `lint:fix`        | ESLint 10: правила Next.js, `strictTypeChecked`, доступность, Prettier    |
| `npm run typecheck`               | `tsc --noEmit`                                                            |
| `npm run format`, `format:check`  | Prettier                                                                  |
| `npm test`, `test:coverage`       | Vitest (`tests/unit`, `*.test.ts`); 100 % на `src/lib/money.ts`           |
| `npm run test:e2e`                | Playwright против `next build && next start`                              |
| `npm run knip`                    | неиспользуемые файлы, экспорты, зависимости                               |
| `npm run jscpd`                   | дубли кода (порог 0 %)                                                    |
| `npm run db:generate`             | SQL из `src/db/schema.ts` в `drizzle/` для сверки с `supabase/migrations` |
| `npm run db:studio`               | Drizzle Studio                                                            |
| `supabase test db`                | pgTAP-тесты RLS из `supabase/tests`                                       |
| `supabase db advisors`            | проверки безопасности базы                                                |

## Что где лежит

- `src/app` — только маршруты и layout (`/`, `/login`, `/notes`, `error.tsx`, `global-error.tsx`, `not-found.tsx`).
- `src/features/<домен>` — Server Actions и компоненты домена (пример: `notes`, `auth`).
- `src/data` — слой доступа к данным: `server-only`, проверка сессии (`verifySession`), DTO наружу.
- `src/db` — схема Drizzle с политиками `pgPolicy` и прямое подключение `db()` для серверных задач (мимо RLS — осознанно).
- `src/lib` — `env.ts` (ленивое чтение переменных), `money.ts` (decimal.js, `formatMoney`), `supabase/` (клиенты `@supabase/ssr`).
- `proxy.ts` — обновление сессии и редирект неавторизованных; не единственная защита.
- `supabase/migrations` — источник правды для базы; `supabase/tests` — pgTAP.
- `tests/unit`, `tests/e2e` — Vitest и Playwright.
- `.claude/` — `settings.json` (маркетплейс `claude-kit`, плагин `dev-kit`, запреты), `rules/` (правила по областям).
- `docs/knowledge` — статус, решения, открытые вопросы; `docs/roadmap.md` — спринты; `docs/superpowers` — спецификации и планы.
- `.github/workflows` — `ci.yml` (lint, typecheck, тесты, knip, jscpd, build, e2e, gitleaks, semgrep), `db.yml` (advisors + pgTAP при изменениях базы).

## Claude Code

В `.claude/settings.json` записаны маркетплейс `Volodymyr-FullStack-Pro/claude-kit` и плагин `dev-kit@claude-kit`: после доверия папке Claude Code предложит установить плагин (скилы по безопасности данных, RLS, деньгам, тестам, ревью; хуки форматирования, проверки типов и защиты `.env`/миграций; команды `/dev-kit:handoff`, `/dev-kit:resume`, `/dev-kit:clickup-card`). Правила проекта — в `.claude/rules/`, процесс — в `CLAUDE.md`.
