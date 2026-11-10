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
npm run gate           # «готово» задачи: check + проверки базы (advisors, db lint, pgTAP, Squawk) + весь e2e на двух устройствах; нужен supabase start
npm run check          # всё, чему не нужна база: линтер, типы, unit с покрытием, сборка, бюджет JS (состав — package.json)
npm run lint           # next typegen + ESLint 10: strict TypeScript, архитектурные границы, защиты денег и доступа (local/*; их пробы — npm run lint:rules), доступность
npm run typecheck      # next typegen && tsc --noEmit (tsconfig strictest)
npm test               # Vitest: ядро на фейках (100 % на domain, 100 % строк и 95 % ветвей на application) и компоненты (jsdom)
npm run test:e2e       # Playwright против production-сборки (без базы сценарии за входом пропускаются)
npm run test:e2e:db    # то же с локальным Supabase — так в CI; один сценарий: -- <файл> --project=desktop
npm run perf           # Lighthouse по бюджету (после build); npm run budget — JS на маршрут; npm run analyze — анализ бандла
npm run knip           # мёртвый код и зависимости
npm run jscpd          # дубли
npm run req:check      # реестр требований заказчика: номера, статусы, непокрытые требования
npm run new:module businesses business   # каркас модуля: имя модуля и одной записи
npm run build
supabase start         # локальный Supabase; supabase test db — pgTAP; supabase db advisors и db lint — проверки; npm run db:check-migrations — Squawk
npm run db:new <имя>   # новая миграция с lock_timeout и statement_timeout; применить — supabase migration up
npm run db:generate    # SQL из src/shared/infrastructure/db/schema.ts в drizzle/ (для сверки; миграции — в supabase/migrations)
npm run db:types       # типы supabase-js из локальной базы → src/shared/infrastructure/supabase/types.ts (numeric: в Row — number, в Insert и Update — string)
npm run seed:test-user # тестовый пользователь для проверки экранов (.env.test.local или переменные окружения); npm run totp -s — код второго фактора
```

## Правила работы

- Язык общения — русский, коротко и по делу. Код, имена файлов и ключи — на английском.
- Правила по областям — в `.claude/rules/` (подключаются по путям файлов: архитектура, стиль, безопасность, база, интерфейс, тесты, документация); подробности — в скилах плагина `dev-kit`. Документация установленной версии Next — `node_modules/next/dist/docs`: перед кодом на API Next, в котором нет уверенности, читать её, а не память — в 16.x менялись API, соглашения и структура файлов.
- Всё, что заказчик сказал, написал, одобрил или прислал — анкета, сообщение, скриншот, файл, пересказ созвона, ТЗ, — строка в `docs/knowledge/requirements.md` в том же ответе, с подтверждением в чате, какие номера записаны (скил `dev-kit:requirements-register`); наше решение — строка в `docs/knowledge/decisions.md`.
- Путь задачи — скил `dev-kit:delivery` (раздел «Путь задачи»). Claude проходит шаги сам: тест → код (`npm test` по ходу) → `/code-review medium` без цели (изменения задачи; уровень — явно, иначе повторится последний) → `npm run gate` → визуальная проверка в теме по умолчанию → `/dev-kit:explain` (разбор в порядке проверки: файлы, объяснение, решения, интерфейс, требования) → **стоп** с напоминанием человеку: всё в порядке — «задача проверена», есть замечания — напиши их → замечания: правки, те же проверки и снова разбор со стопом → только на «задача проверена» сам `/dev-kit:task-done`; «ок», «да» посреди проверки задачу не закрывают — ответить напоминанием. Следующая задача — по «дальше», в новом окне. Перед любым планом — перечитать разделы ТЗ, реестр и решения D-NNN; расхождение с ТЗ — вопрос, не догадка. Последняя задача блока — «Закрытие блока»: `/code-review high <номер PR>`, `/simplify <номер PR>`, `/security-review`, `npm run gate` (здесь всегда с полным e2e), обе темы, `npm run req:check -- --strict` (исключение B00 — в его `tasks.md`); CI — на каждый push. PR блока остаётся draft до конца: «Ready for review» нажимает и сливает человек. После слияния PR Claude обновляет `main` и удаляет слитые ветки.
- Superpowers — по таблице «Superpowers в цикле» скила `dev-kit:delivery`; этот файл важнее скилов Superpowers. `brainstorming` — на старте блока (крупный — спека `docs/blocks/<блок>/spec.md`); после одобрения дизайна — `README.md` и `tasks.md` блока, не `writing-plans`; задача из утверждённого `tasks.md` уже одобрена. План — только у крупной задачи: один на задачу, `docs/blocks/BNN-<имя>/plans/BNN-TNN.md` (вне блоков — `docs/plans/<тема>.md`, не `docs/superpowers/`), в шапке — `executing-plans`, одобрения плана не ждём. Исполнение — `executing-plans` в ветке блока, без worktree и без финального ревью ветки (`subagent-driven-development` — только по просьбе человека); коммиты шагов — `wip: BNN-TNN …` (и в шагах плана), префикс `BNN-TNN:` только у `/dev-kit:task-done`; решения, принятые без человека, записываются в раздел «Решения по ходу» в конце файла плана — оттуда их берёт `/dev-kit:explain`; папку плана в `.superpowers/sdd/` не удалять; по ходу понадобилась новая таблица, модуль или чужой интерфейс — стоп и вопрос человеку. После последнего шага — не `finishing-a-development-branch`, а остаток пути задачи до стопа; `/dev-kit:task-done` — только на «задача проверена», слияние — человек. `requesting-code-review` не используем (ревью — `/code-review`), параллельные субагенты только читают.
- Тест первым не нужен (заранее одобрено) для конфигов, CI, сгенерированных типов, токенов дизайна и словарей; у миграции тест первым — pgTAP. Ветки: блок — `block/B01-<имя>`, создаётся в начале блока, до спеки и `README.md`; правка — `fix/<имя>`, документы отдельной темой — `docs/<тема>`; строка реестра или решение посреди задачи — в текущей ветке тем же коммитом; в `main` напрямую не коммитим. Первый блок — `B00-setup` (`docs/blocks/B00-setup/`).
- Проверка экранов за входом: `npm run dev`, вход тестовым пользователем (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USER_TOTP_SECRET` — из `.env.test.local` или из переменных окружения; пользователь заводится `npm run seed:test-user`, после `supabase db reset` — снова), код второго фактора — `npm run totp -s`. В клоне или worktree перед командами с базой — `SUPABASE_PROJECT_ID=<имя папки оригинала>`.
- Остальные `.env*`, `.vercel/**` и `supabase/.env*` Claude не читает (запрет в `.claude/settings.json`). Запрет защищает от случайности, не от исполнения кода: разрешённые команды (`npm test`) выполняют код проекта с правами пользователя — токены production на машине разработки не держим.
- **Готово** — одно определение: задача — `npm run gate` зелёный; когда полный e2e идёт дольше 3 минут — на задаче `npm run check`, проверки базы и только затронутые сценарии, полный прогон остаётся в CI и на закрытии блока. Блок — пройдена задача «Закрытие блока».
- Процесс улучшается по ходу: правило, хук, скил или проверка, которые мешают или не приносят пользы, не обходятся молча — Claude называет это в отчёте и предлагает изменение; принятое — строка D-NNN и правка шаблона или плагина `dev-kit`.
- Миграции, `.env*` и lock-файлы Claude правит только с подтверждением (хук плагина). Node 24 и npm не ниже 11.19 везде — локально, в CI и на Vercel (`engines` в `package.json` и `engine-strict` в `.npmrc`: более старый npm установку не начинает); lock-файл пишет обычный `npm install`, на коммите его проверяет `scripts/check-lock.mjs` (npm 11.19.0). Install-скрипты зависимостей запрещены, версия моложе трёх дней не ставится (`allowScripts` в `package.json`, `.npmrc`); как поставить пакет со скриптом или срочное исправление — README, «Зависимости и lock-файл».

## Плагин dev-kit

Плагин `dev-kit` ставится на уровне пользователя, в настройках проекта не объявлен: `claude plugin marketplace add Volodymyr-FullStack-Pro/claude-kit && claude plugin install dev-kit@claude-kit`.
