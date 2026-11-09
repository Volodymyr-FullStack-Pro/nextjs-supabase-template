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
npm run test:e2e       # Playwright против production-сборки (без базы сценарии за входом пропускаются)
npm run test:e2e:db    # то же с локальным Supabase — так в CI и при закрытии блока
npm run perf           # Lighthouse по бюджету (после build); npm run budget — JS на маршрут; npm run analyze — анализ бандла
npm run knip           # мёртвый код и зависимости
npm run jscpd          # дубли
npm run req:check      # реестр требований заказчика: номера, статусы, непокрытые требования
npm run new:module businesses business   # каркас модуля: имя модуля и одной записи
npm run build
supabase start         # локальный Supabase; supabase test db — pgTAP; supabase db advisors — проверки
npm run db:generate    # SQL из src/shared/infrastructure/db/schema.ts в drizzle/ (для сверки; миграции — в supabase/migrations)
npm run db:types       # типы supabase-js из локальной базы → src/shared/infrastructure/supabase/types.ts
```

## Правила работы

- Язык общения — русский, коротко и по делу. Код, имена файлов и ключи — на английском.
- Правила по областям — в `.claude/rules/` (подключаются по путям файлов: архитектура, стиль, безопасность, база, интерфейс, тесты, документация); подробности — в скилах плагина `dev-kit`.
- Всё, что заказчик сказал, написал, одобрил или прислал — анкета, сообщение, скриншот, файл, пересказ созвона, ТЗ, — строка в `docs/knowledge/requirements.md` в том же ответе, с подтверждением в чате, какие номера записаны (скил `dev-kit:requirements-register`); наше решение — строка в `docs/knowledge/decisions.md`.
- Путь задачи — скил `dev-kit:delivery` (правило 7). Claude проходит шаги сам: тест → код → `npm test` → `/code-review medium` без цели (изменения задачи; уровень — явно, иначе повторится последний) → e2e затронутых сценариев → визуальная проверка в теме по умолчанию → `/dev-kit:explain` → **стоп до «ок» человека** → на «ок» сам `/dev-kit:task-done`. Последняя задача блока — «Закрытие блока»: `/code-review high <номер PR>`, `/simplify <номер PR>`, `/security-review`, `npm run check`, e2e на двух устройствах, обе темы, `npm run req:check -- --strict`; CI — на каждый push. После слияния PR Claude обновляет `main` и удаляет слитые ветки.
- Superpowers — по таблице «Superpowers в цикле» скила `dev-kit:delivery`; этот файл важнее скилов Superpowers. `brainstorming` — на старте блока (крупный — спека `docs/blocks/<блок>/spec.md`); после одобрения дизайна — `README.md` и `tasks.md` блока, не `writing-plans`; задача из утверждённого `tasks.md` уже одобрена. План — только у крупной задачи: один на задачу, `docs/blocks/BNN-<имя>/plans/BNN-TNN.md` (вне блоков — `docs/plans/<тема>.md`, не `docs/superpowers/`), в шапке — `executing-plans`, одобрения плана не ждём. Исполнение — `executing-plans` в ветке блока, без worktree и без финального ревью ветки (`subagent-driven-development` — только по просьбе человека); коммиты шагов — `wip: BNN-TNN …` (и в шагах плана), префикс `BNN-TNN:` только у `/dev-kit:task-done`; папку плана в `.superpowers/sdd/` не удалять — из неё `/dev-kit:explain` берёт решения по ходу; по ходу понадобилась новая таблица, модуль или чужой интерфейс — стоп и вопрос человеку. После последнего шага — не `finishing-a-development-branch`, а остаток пути задачи до стопа; `/dev-kit:task-done` — только на «ок», слияние — человек. `requesting-code-review` не используем (ревью — `/code-review`), параллельные субагенты только читают.
- Тест первым не нужен (заранее одобрено) для конфигов, CI, сгенерированных типов, токенов дизайна и словарей; у миграции тест первым — pgTAP. Ветки: блок — `block/B01-<имя>`, создаётся в начале блока, до спеки и `README.md`; правка — `fix/<имя>`, документы отдельной темой — `docs/<тема>`; строка реестра или решение посреди задачи — в текущей ветке тем же коммитом; в `main` напрямую не коммитим. Первый блок — `B00-setup` (`docs/blocks/B00-setup/`).
- Проверка экранов за входом: `npm run dev`, вход тестовым пользователем из `.env.test.local` (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`); остальные `.env*` Claude не читает (запрет в `.claude/settings.json`).
- **Готово:** задача — проверки правила 7 скила `delivery` зелёные (при изменениях базы — `supabase test db`); блок — задача «Закрытие блока» пройдена: `npm run check` и `npm run test:e2e:db` на обоих устройствах зелёные.
- Процесс улучшается по ходу: правило, хук, скил или проверка, которые мешают или не приносят пользы, не обходятся молча — Claude называет это в отчёте и предлагает изменение; принятое — строка D-NNN и правка шаблона или плагина `dev-kit`.
- Миграции, `.env*` и lock-файлы Claude правит только с подтверждением (хук плагина). Node 24 и npm 11 везде — локально, в CI и на Vercel; lock-файл пишет обычный `npm install`, на коммите его проверяет `scripts/check-lock.mjs`.

## Плагин dev-kit

Маркетплейс и плагин записаны в `.claude/settings.json`; после доверия папке Claude Code предложит их установить. Вручную: `claude plugin marketplace add Volodymyr-FullStack-Pro/claude-kit && claude plugin install dev-kit@claude-kit`.
