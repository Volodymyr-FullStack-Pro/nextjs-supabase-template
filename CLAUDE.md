# <Проект>

<Одна фраза: что это за система и для кого.> Стартовая точка — шаблон `nextjs-supabase-template`: Next.js 16 (App Router, Cache Components), Supabase (Auth, Postgres с RLS), Drizzle, строгий TypeScript, shadcn/ui; архитектура «модули и четыре слоя» (README, раздел «Архитектура»).

## Начинать отсюда

- [docs/knowledge/README.md](docs/knowledge/README.md) — статус, ссылки, люди, где что лежит.
- [docs/knowledge/requirements.md](docs/knowledge/requirements.md) — реестр требований заказчика: каждый ответ и решение, статус, раздел спецификации.
- [docs/knowledge/decisions.md](docs/knowledge/decisions.md) — журнал решений; новое решение — строка D-NNN.
- [docs/knowledge/open-questions.md](docs/knowledge/open-questions.md) — что ещё не решено.
- [docs/roadmap.md](docs/roadmap.md) — спринты и эпики с чекбоксами.

## Структура

`src/app` — только маршруты и Suspense. `src/modules/<домен>/{domain,application,infrastructure,ui}` + `server.ts` — домены. `src/shared/{domain,infrastructure,lib,ui}` — общее. Зависимости только внутрь (линтер границ). Новый модуль: `npm run new:module <имя>`.

## Команды

```bash
npm run dev            # next dev
npm run lint           # next typegen + ESLint 10: strict TypeScript, архитектурные границы (a11y — 6 правил, см. README)
npm run typecheck      # next typegen && tsc --noEmit (tsconfig strictest)
npm test               # Vitest: ядро на фейках (100 % на src/**/domain/**) и компоненты (jsdom)
npm run test:e2e       # Playwright против production-сборки
npm run perf           # Lighthouse по бюджету (после build); npm run budget — JS на маршрут; npm run analyze — анализ бандла
npm run knip           # мёртвый код и зависимости
npm run jscpd          # дубли
npm run req:check      # реестр требований заказчика: номера, статусы, непокрытые требования
npm run new:module X   # каркас модуля
npm run build
supabase start         # локальный Supabase; supabase test db — pgTAP; supabase db advisors --local — проверки
npm run db:generate    # SQL из src/shared/infrastructure/db/schema.ts в drizzle/ (для сверки; миграции — в supabase/migrations)
npm run db:types       # типы supabase-js из локальной базы → src/shared/infrastructure/supabase/types.ts
```

## Правила работы

- Язык общения — русский, коротко и по делу. Код, имена файлов и ключи — на английском.
- Правила по областям — в `.claude/rules/` (архитектура, безопасность данных, база, интерфейс, тесты, документация); подробности — в скилах плагина `dev-kit`.
- Ответ или решение заказчика из любого канала — строка в `docs/knowledge/requirements.md` в тот же день; задачи и тесты ссылаются на её номера (скил `dev-kit:requirements-register`).
- После любого решения — строка в `docs/knowledge/decisions.md`; roadmap обновляется в конце задачи.
- Процесс: эпик из roadmap → `brainstorming` → спецификация в `docs/superpowers/specs/` → `writing-plans` → `executing-plans` (планы не длиннее 12 задач) → `/simplify` → `/code-review` → `/security-review` для auth, денег и миграций → PR.
- Server Actions — через `authActionClient` / `actionClient` + use case из `server.ts` модуля; формы — `TextField` + react-hook-form + Zod-схема из `domain`; уведомления — sonner; фильтры — в URL (nuqs); компоненты — shadcn (`npx shadcn add`).
- Правила домена и use cases пишутся с тестом (Vitest на фейках) до кода; имя теста — глагол в третьем лице про намерение (`it('rejects an empty title')`).
- Каждый экран проектируется под бюджет производительности (скил `dev-kit:performance-budget`): оболочка + Suspense, теги кэша, без водопадов, минимум JS.
- Перед «готово»: `npm run lint && npm run typecheck && npm test && npm run test:e2e`; при изменениях базы — `supabase test db`; `npm run req:check -- --strict`.
- Миграции, `.env*` и lock-файлы Claude правит только с подтверждением (хук плагина). Зависимости меняются с `npx npm@10 install --package-lock-only` (CI и Vercel — npm 10). На коммите lint-staged прогоняет eslint и prettier по изменённым файлам.

## Плагин dev-kit

Маркетплейс и плагин записаны в `.claude/settings.json`; после доверия папке Claude Code предложит их установить. Вручную: `claude plugin marketplace add Volodymyr-FullStack-Pro/claude-kit && claude plugin install dev-kit@claude-kit`.
