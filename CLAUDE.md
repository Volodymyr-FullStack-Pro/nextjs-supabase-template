# <Проект>

<Одна фраза: что это за система и для кого.> Стартовая точка — шаблон `nextjs-supabase-template`: Next.js 16 (App Router, Cache Components), Supabase (Auth, Postgres с RLS), Drizzle, строгий TypeScript, shadcn/ui; архитектура «модули и четыре слоя» (README, раздел «Архитектура»).

## Начинать отсюда

- [docs/knowledge/README.md](docs/knowledge/README.md) — статус, ссылки, люди, где что лежит.
- [docs/knowledge/requirements.md](docs/knowledge/requirements.md) — реестр требований заказчика: каждый ответ и решение, статус, раздел спецификации.
- [docs/knowledge/decisions.md](docs/knowledge/decisions.md) — журнал решений; новое решение — строка D-NNN.
- [docs/knowledge/open-questions.md](docs/knowledge/open-questions.md) — что ещё не решено.
- [docs/roadmap.md](docs/roadmap.md) — «Сейчас» и спринты с блоками; блок — папка `docs/blocks/<B01-имя>/` (`README.md` и `tasks.md`).

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
- Правила по областям — в `.claude/rules/` (подключаются по путям файлов: архитектура, стиль, безопасность, база, интерфейс, тесты, документация); подробности — в скилах плагина `dev-kit`.
- Ответ или решение заказчика из любого канала — строка в `docs/knowledge/requirements.md` в тот же день (скил `dev-kit:requirements-register`); наше решение — строка в `docs/knowledge/decisions.md`.
- Путь задачи — скил `dev-kit:delivery`: ветка блока → тест → код → `npm run check` → `/simplify` → `/code-review` (`/security-review` для auth, денег, миграций) → `/dev-kit:explain` → **стоп до «ок» человека** → `/dev-kit:task-done`. Следующая задача — только после «ок».
- **Готово:** `npm run check` и `npm run test:e2e` зелёные; при изменениях базы — `supabase test db`.
- Процесс улучшается по ходу: правило, хук, скил или проверка, которые мешают или не приносят пользы, не обходятся молча — Claude называет это в отчёте и предлагает изменение; принятое — строка D-NNN и правка шаблона или плагина `dev-kit`.
- Миграции, `.env*` и lock-файлы Claude правит только с подтверждением (хук плагина). Зависимости — `npx npm@10 install --package-lock-only` (CI и Vercel — npm 10).

## Плагин dev-kit

Маркетплейс и плагин записаны в `.claude/settings.json`; после доверия папке Claude Code предложит их установить. Вручную: `claude plugin marketplace add Volodymyr-FullStack-Pro/claude-kit && claude plugin install dev-kit@claude-kit`.
