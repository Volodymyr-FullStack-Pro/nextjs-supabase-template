# <Проект>

<Одна фраза: что это за система и для кого.> Стартовая точка — шаблон `nextjs-supabase-template`: Next.js 16 (App Router, `src/`), Supabase (Auth, Postgres с RLS), Drizzle, строгий TypeScript, Tailwind 4.

## Начинать отсюда

- [docs/knowledge/README.md](docs/knowledge/README.md) — статус, ссылки, люди, где что лежит.
- [docs/knowledge/decisions.md](docs/knowledge/decisions.md) — журнал решений; новое решение — строка D-NNN.
- [docs/knowledge/open-questions.md](docs/knowledge/open-questions.md) — что ещё не решено.
- [docs/roadmap.md](docs/roadmap.md) — спринты и эпики с чекбоксами.

## Команды

```bash
npm run dev            # next dev
npm run lint           # next typegen + ESLint 10, strict TypeScript (a11y — только 6 правил из eslint-config-next, см. README)
npm run typecheck      # next typegen && tsc --noEmit (tsconfig strictest)
npm test               # Vitest: unit и компоненты (jsdom)
npm run test:e2e       # Playwright против production-сборки
npm run knip           # мёртвый код и зависимости
npm run jscpd          # дубли
npm run build
supabase start         # локальный Supabase; supabase test db — pgTAP; supabase db advisors --local — проверки безопасности
npm run db:generate    # SQL из src/db/schema.ts в drizzle/ (для сверки; миграции — в supabase/migrations)
npm run db:types       # типы supabase-js из локальной базы → src/lib/supabase/types.ts
```

## Правила работы

- Язык общения — русский, коротко и по делу. Код, имена файлов и ключи — на английском.
- Правила по областям — в `.claude/rules/` (безопасность данных, база, интерфейс, тесты, документация); подробности — в скилах плагина `dev-kit`.
- Ответ или решение заказчика из любого канала — строка в `docs/knowledge/requirements.md` в тот же день; задачи и тесты ссылаются на её номера (скил `dev-kit:requirements-register`).
- После любого решения — строка в `docs/knowledge/decisions.md`; roadmap обновляется в конце задачи.
- Процесс: эпик из roadmap → `brainstorming` → спецификация в `docs/superpowers/specs/` → `writing-plans` → `executing-plans` (планы не длиннее 12 задач) → `/simplify` → `/code-review` → `/security-review` для auth, денег и миграций → PR.
- Перед «готово»: `npm run lint && npm run typecheck && npm test && npm run test:e2e`; при изменениях базы — `supabase test db`.
- Server Actions — через `authActionClient` / `actionClient` (`src/lib/safe-action.ts`), формы — `TextField` + react-hook-form + Zod-схема, общая с action; уведомления — sonner; фильтры — в URL (nuqs); компоненты — shadcn (`npx shadcn add`).
- Миграции, `.env*` и lock-файлы Claude правит только с подтверждением (хук плагина). На коммите lint-staged прогоняет eslint и prettier по изменённым файлам.

## Плагин dev-kit

Маркетплейс и плагин записаны в `.claude/settings.json`; после доверия папке Claude Code предложит их установить. Вручную: `claude plugin marketplace add Volodymyr-FullStack-Pro/claude-kit && claude plugin install dev-kit@claude-kit`.
