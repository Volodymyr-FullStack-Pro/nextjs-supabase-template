# <Проект>

<Одна фраза: что это за система и для кого.> Стартовая точка — шаблон `nextjs-supabase-template`: Next.js 16 (App Router, Cache Components), Supabase (Auth, Postgres с RLS), Drizzle, строгий TypeScript, shadcn/ui; архитектура «модули и четыре слоя» (README, раздел «Архитектура»).

## Начинать отсюда

- [docs/knowledge/README.md](docs/knowledge/README.md) — статус, ссылки, люди, где что лежит.
- [docs/knowledge/requirements.md](docs/knowledge/requirements.md) — реестр требований заказчика: каждый ответ и решение, статус, раздел спецификации.
- [docs/knowledge/decisions.md](docs/knowledge/decisions.md) — журнал решений; новое решение — строка D-NNN.
- [docs/knowledge/open-questions.md](docs/knowledge/open-questions.md) — что ещё не решено.
- [docs/design/design-system.md](docs/design/design-system.md) — дизайн-система, выбранная заказчиком: цвета, шрифт, состояния, доступность.
- [docs/roadmap.md](docs/roadmap.md) — «Сейчас» и спринты с блоками; блок — папка `docs/blocks/<B01-имя>/` (`README.md` и `tasks.md`).

## Структура

`src/app` — только маршруты и Suspense. `src/modules/<домен>/{domain,application,infrastructure,ui}` + `server.ts` — домены. `src/shared/{domain,infrastructure,lib,ui}` — общее. Зависимости только внутрь (линтер границ). Новый модуль: `npm run new:module <модуль> <запись>`.

## Команды

```bash
npm run dev            # next dev
npm run lint           # next typegen + ESLint 10: strict TypeScript, архитектурные границы, доступность (jsx-a11y strict)
npm run typecheck      # next typegen && tsc --noEmit (tsconfig strictest)
npm test               # Vitest: ядро на фейках (100 % на src/**/domain/**) и компоненты (jsdom)
npm run test:e2e       # Playwright против production-сборки
npm run perf           # Lighthouse по бюджету (после build); npm run budget — JS на маршрут; npm run analyze — анализ бандла
npm run knip           # мёртвый код и зависимости
npm run jscpd          # дубли
npm run req:check      # реестр требований заказчика: номера, статусы, непокрытые требования
npm run new:module businesses business   # каркас модуля: имя модуля и одной записи
npm run build
supabase start         # локальный Supabase; supabase test db — pgTAP; supabase db advisors --local — проверки
npm run db:generate    # SQL из src/shared/infrastructure/db/schema.ts в drizzle/ (для сверки; миграции — в supabase/migrations)
npm run db:types       # типы supabase-js из локальной базы → src/shared/infrastructure/supabase/types.ts
```

## Правила работы

- Язык общения — русский, коротко и по делу. Код, имена файлов и ключи — на английском.
- Правила по областям — в `.claude/rules/` (подключаются по путям файлов: архитектура, стиль, безопасность, база, интерфейс, тесты, документация); подробности — в скилах плагина `dev-kit`.
- Всё, что заказчик сказал, написал, одобрил или прислал — анкета, сообщение, скриншот, файл, пересказ созвона, ТЗ, — строка в `docs/knowledge/requirements.md` в том же ответе, с подтверждением в чате, какие номера записаны (скил `dev-kit:requirements-register`); наше решение — строка в `docs/knowledge/decisions.md`.
- Путь задачи — скил `dev-kit:delivery` (правило 7). Claude проходит шаги сам: тест → код → `npm test` → `/code-review` (`/security-review` для входа, прав, денег, миграций) → e2e затронутых сценариев → визуальная проверка → `/dev-kit:explain` → **стоп до «ок» человека** → на «ок» сам `/dev-kit:task-done`. Полная проверка (`/simplify`, `npm run check`, e2e на двух устройствах, обе темы) — при закрытии блока; CI — на каждый push.
- Superpowers — по таблице «Superpowers в цикле» скила `dev-kit:delivery` (она важнее умолчаний Superpowers): `brainstorming` на старте блока (крупный — спека `docs/blocks/<блок>/spec.md`), задача из утверждённого `tasks.md` уже одобрена; план — на одну задачу, `docs/blocks/<блок>/plans/<задача>.md`; исполнение плана — в ветке блока без worktree; вместо `finishing-a-development-branch` — `/dev-kit:task-done`, слияние — человек. Ветки: блок — `block/B01-<имя>`, правка — `fix/<имя>`, документы отдельной темой — `docs/<тема>`; строка реестра или решение посреди задачи — в текущей ветке тем же коммитом; в `main` напрямую не коммитим. Первый блок — `B00-setup` (`docs/blocks/B00-setup/`).
- Проверка экранов за входом: `npm run dev`, вход тестовым пользователем из `.env.test.local` (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`); остальные `.env*` Claude не читает (запрет в `.claude/settings.json`).
- **Готово:** задача — проверки правила 7 скила `delivery` зелёные (при изменениях базы — `supabase test db`); блок — `npm run check` и `npm run test:e2e` на обоих устройствах.
- Процесс улучшается по ходу: правило, хук, скил или проверка, которые мешают или не приносят пользы, не обходятся молча — Claude называет это в отчёте и предлагает изменение; принятое — строка D-NNN и правка шаблона или плагина `dev-kit`.
- Миграции, `.env*` и lock-файлы Claude правит только с подтверждением (хук плагина). Node 24 и npm 11 везде — локально, в CI и на Vercel; lock-файл пишет обычный `npm install`, на коммите его проверяет `scripts/check-lock.mjs`.

## Плагин dev-kit

Маркетплейс и плагин записаны в `.claude/settings.json`; после доверия папке Claude Code предложит их установить. Вручную: `claude plugin marketplace add Volodymyr-FullStack-Pro/claude-kit && claude plugin install dev-kit@claude-kit`.
