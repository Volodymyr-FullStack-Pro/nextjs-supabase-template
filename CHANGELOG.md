# Changelog шаблона

Что менялось в шаблоне. Проект, созданный раньше, переносит нужное руками и записывает это строкой D-NNN.

## 2026-11-27 — Windows: the next task in the same window under 200k tokens

- `CLAUDE.md`, «Окна и расход CI»: after an accepted task the next one is taken by «дальше» in the same window while the context holds under 200k tokens, from 200k — in a new window without a handoff (was «always a new window»); mid-task the handoff advice is at about 200k and 300k tokens (was 300k and 400k), as in plugin dev-kit 0.22.3.

## 2026-11-27 — `generator:check` after an e2e helper edit: only helpers the templates import

- `.claude/rules/architecture.md`, `.claude/rules/tests.md`, `CLAUDE.md` («Команды»): `npm run generator:check` after a `tests/e2e/support` edit only when the generator templates import that file, directly or through another support file; other helpers are not checked by the templates (plugin dev-kit 0.22.2).

## 2026-11-22 — Task route: every sign of the full route, the checks of each route

- `CLAUDE.md`, «Маршрут задачи»: the full route lists every sign — code that checks sign-in or permissions or computes or stores money (a text on the sign-in screen is not a sign), a migration, `src/proxy.ts`, CSP in `next.config.ts`, `.github/workflows`, the «Не сломать» field, a large task; its review (`/code-review high` and an agent with the `/security-review` prompt on the task diff) moved here from the task path. The fast route names what it skips — test cases, the completeness pass, the lesson page — and Claude checks the screen himself. Tests and code are written by different authors, not «by different agents»: a task without a plan gets its code from the main session.
- `CLAUDE.md`, other lines: the task path says its steps follow the route; «Готово» — a fast task without touched e2e scenarios is `npm run check` (was «documents only»: `gate:quick` refuses to run without scenarios); the block closing points to its task in `docs/blocks/_template/tasks.md` instead of repeating the list; Superpowers — a subagent writes code only from a ready plan, one writes at a time (replaces «parallel subagents only read»).
- `docs/blocks/_template/tasks.md`: «Как проверить» adds `npm run check` for a task without touched e2e scenarios; «Проверено» — the route's checks and, on the full route, the line «Мутация: …»; «Закрытие блока» — findings are checked against the block's `review-log.md`, the file is deleted after the review. The same line goes to «Закрытие блока» of `docs/blocks/B00-setup/tasks.md`.
- `.claude/rules/tests.md`: «готово» of a task is the route's checks, not always `npm run gate`. README, «Команды»: `gate:quick` is for the fast route with touched e2e scenarios as well as for a full e2e over 3 minutes.
- `.claude/rules/docs.md`: the task lesson is the page `docs/_scratch/lesson.html` written by `/dev-kit:explain` (the outdated `current-diff.md` row and the word «разбор» are gone).
- `CLAUDE.md`, «Окна и расход CI»: the handoff advice is at about 300k tokens (the next checkpoint) and 400k (after the current small step), as in plugin dev-kit 0.22.1; an accepted task always means a new window — the exception for a small next task in a window under ~100k tokens is gone. The fast route also skips the block's findings log.
- ClickUp: a block subtask gets a short summary of «Итог» for the manager, without technical details, not «Итог» word for word (`.claude/rules/docs.md`, `docs/blocks/_template/tasks.md`, `.claude/rules/clickup.md.example`); «Итог» in `tasks.md` and its English version in the PR stay as they were. Needs plugin dev-kit 0.22.1.
- `docs/blocks/_template/tasks.md`: a large task keeps its «Тест-кейсы» in its plan.
- `docs/blocks/B00-setup/tasks.md`: every task line names its route and sign (T01, T03, T04, T07 — full; T02, T05, T06 — fast; T08 — standard).
- Project-specific decision numbers and the project name are gone from this changelog, `docs/blocks/B00-setup/tasks.md`, `.claude/rules/db.md`, README and a comment in `next.config.ts`; the wording keeps its meaning.
- For a project created earlier: copy the edited lines of `CLAUDE.md`, `.claude/rules/tests.md`, `.claude/rules/docs.md`, README «Команды» and `docs/blocks/_template/tasks.md`; `.claude/rules/clickup.md` — by the example.

## 2026-11-22 — Task route and test cases before code

- `docs/blocks/_template/tasks.md`: the task line gets `Маршрут: <быстрый | обычный | полный>` between «Требования» and «Подзадача»; a comment after «Не сломать» shows the «Тест-кейсы» section Claude adds before code on the standard and full routes («название — дано …, когда …, тогда …; проверяется: e2e | unit | pgTAP | вручную»).
- `CLAUDE.md`: a «Маршрут задачи» line — fast: `gate:quick`, `/code-review medium`, a chat summary without the lesson page and test cases; full (sign-in, permissions, money, migrations, a large task): also the plan critic, tests and code by different agents and one mutation check; only the human lowers a route. The task path starts with test cases, runs the completeness pass with the review and checks findings against the block's `review-log.md`; the review level follows the route instead of a list of files; «Готово» names the fast route (`gate:quick`, documents only — `npm run check`).
- Needs plugin dev-kit 0.22.0 or later: `route.md` of the `delivery` skill and the agents `plan-critic` and `criteria-trace`.
- No script parses the task line: `npm run req:check` looks for requirement ids anywhere in `docs/blocks` and skips `_template`.
- For a project created earlier: copy the two edits of `docs/blocks/_template/tasks.md` and the three edited lines of `CLAUDE.md`; a task planned earlier gets its route named in chat when it is taken.

## 2026-11-21 — Page quality check ignores library helper elements

- `checkPageQuality` (`tests/e2e/support/page-quality.ts`): axe skips the focus guards Base UI puts around an open dialog (`[data-base-ui-focus-guard]`); the touch target check skips elements of 1×1 px or less — the visually hidden `input` behind a Base UI checkbox; the page heading is found as a visible `h1` by tag, not by role.
- Why: with a modal dialog open the rest of the page is hidden from the accessibility tree, so the role query did not find the heading; and WebKit keeps a hidden copy of streamed content for 150–300 ms, so a heading under `<Suspense>` matched twice.
- Accepted risk: a real control of 1×1 px passes the touch target check; a page with two visible `h1` fails the strict locator — that is a markup error.
- For a project created earlier: copy the four edits of the file.

## 2026-11-21 — The picomatch audit exception is removed

- `scripts/audit-exceptions.mjs` is empty again: GitHub withdrew GHSA-fc5q-39xc-vjpf on 2026-11-18, `npm audit` no longer reports it, and `npm run audit:prod` fails on an exception the audit does not report — the job was red on every pull request.
- For a project created earlier: remove the entry from `scripts/audit-exceptions.mjs` and run `npm run audit:prod`.

## 2026-11-18 — Documentation-only pull requests skip Playwright

- CI: a pull request first runs the job «Changed files» (`scripts/ci-changes.mjs`): the files changed against the tip of the base branch (the first parent of the PR merge commit) and whether they are all documents (`scripts/ci-changes-check.mjs`, unit test `tests/unit/scripts/ci-changes.test.ts`). A document is a file in `docs/` or `.claude/`, a `.md` file in the root, `.github/pull_request_template.md` or `supabase/README.md`; everything else, a `.md` in any other folder included, is code. If only documents changed, the Playwright job (with the speed budget and the generator check) is skipped; «Lint, types, unit, dead code, build» with `docs:check`, Secrets and Semgrep run as before.
- Why: Playwright takes about 13 of the 15 minutes, and documents (spec, register, decisions, rules) change much more often than code.
- A skipped job counts as a passed required check, so Playwright runs on `!cancelled()`: if «Changed files» fails or gets no list, the answer is missing and the run is full, not skipped; an empty list or an unknown base is a full run too. Push to `main` and the weekly run always run everything. `paths-ignore` on the whole workflow was rejected: a skipped workflow leaves required checks pending and blocks the merge.
- Accepted risk: changing the base branch of a PR does not rerun CI, so a documentation PR into an unchecked branch retargeted to `main` keeps the skip; the full run on `main` catches it after the merge.
- A new place for documents is an edit of the list in `scripts/ci-changes-check.mjs`; a folder that e2e or the build start reading leaves the list.
- `CLAUDE.md` and README, `npm run ci:usage`: «without Playwright for documentation-only changes» is no longer a saving to propose, it is built in.
- For a project created earlier: copy the two scripts and the test, add the `changes` job and `needs: changes` with the `if` to the `e2e` job in `.github/workflows/ci.yml`; check the document list against the project's folders.

## 2026-11-18 — Dependency audit with dated exceptions

- CI runs `npm run audit:prod` (`scripts/audit.mjs`) instead of `npm audit --omit=dev --audit-level=high`. A high or critical advisory in production dependencies fails the job as before, except the entries in `scripts/audit-exceptions.mjs`: an advisory id, the packages it covers, a reason and a review date at most 31 days ahead. An exception excuses the advisory only in the named packages and stops working the day after the review date; an incomplete entry, an exception the audit no longer reports, or an empty or malformed npm report fail the job too (`scripts/audit-check.mjs`, unit test `tests/unit/scripts/audit-check.test.ts`).
- Why: GHSA-fc5q-39xc-vjpf (`picomatch` up to 4.0.7, ReDoS on a crafted glob, high) has no fixed version, so `overrides` cannot help, and the old step was red on every pull request. It is the first exception, review by 2026-12-01; the package comes with the Sentry build plugin, `vite` and `tinyglobby`, which take glob patterns from our code and configuration, not from users.
- `.claude/rules/security.md`: a new exception needs the project owner's consent and a D-NNN row.
- For a project created earlier: copy the three scripts and the test, add `"audit:prod": "node scripts/audit.mjs"` to `package.json`, replace the audit step in `.github/workflows/ci.yml`; check the reason of the exception against `npm ls picomatch --omit=dev` of the project.

## 2026-11-16 — Order in `docs`: client and ops folders, document lifecycle checks

- `docs/client/` holds everything from and for the client (`source/`, `tz/` with `questionnaires/`, `design-board/`); `docs/ops/` holds service settings made outside the repository (`docs/ops/github/branch-protection.json`, moved from `docs/github/`). `.prettierignore` lists `docs/client/` in one line instead of seven folders.
- `docs/README.md` is the map of the `docs` folder (moved from `docs/knowledge/README.md`); its «Status» table is gone: the project status lives only in «Сейчас» of `docs/roadmap.md`.
- `npm run docs:check` got four checks (`scripts/docs-structure.mjs`): «Сейчас» is at most 80 words; a plan in `docs/plans/` that «Сейчас» does not name; a file in `docs/` that no other file links to (except `docs/client/` and `docs/knowledge/decisions/`); a markdown link to a path that is not in git.
- Limits: `docs/architecture.md` — 7,000 words instead of 400 lines (an entry is counted by its text, not by line wrapping); the decision journal — 200 rows instead of 100.
- `.claude/rules/docs.md`, section «Жизнь документов»: a working document is deleted in the task where it stops being needed; a task outside blocks closes like a block task (plan deleted, «Сейчас» rewritten, the result as a ClickUp comment). Needs plugin dev-kit 0.19.0 or later, whose skills and commands name the new paths.
- `docs/release.md`: the squash merge commit takes its text from the PR title and description (`squash_merge_commit_title=PR_TITLE`, `squash_merge_commit_message=PR_BODY`), not from the branch commits: a `[skip ci]` of a `handoff:` commit (plugin dev-kit 0.19.0) would otherwise land in the merge commit and GitHub would skip CI and the migration deploy on `main`. For a project created earlier: run the `gh api -X PATCH` line from `docs/release.md`.
- `.claude/rules/docs.md`: the review note `docs/_scratch/current-diff.md` is up to 300 lines with a summary of up to 15 lines on top (plugin dev-kit 0.19.0 writes it that way).
- CI: the Playwright report is uploaded only when a test failed, and a failed upload does not fail the job (`if: failure()`, `continue-on-error`): with the artifact storage quota exhausted every green run turned red on the upload step.
- For a project created earlier: `git mv` the client folders into `docs/client/`, `docs/github` into `docs/ops/github`, `docs/knowledge/README.md` to `docs/README.md`; copy `scripts/docs-structure.mjs`, `scripts/docs-check.mjs`, `scripts/docs-limits.mjs`, their tests and the rule; then fix what `npm run docs:check` reports.

## 2026-11-13 — Gate fingerprint without the handoff note

- `npm run gate` leaves `.claude/handoff.md` out of the working-tree fingerprint and lists it in the stamp (`excluded`; needs plugin dev-kit 0.18.3 or later, which reads it from there): a handoff commit after a green gate no longer turns `/dev-kit:explain` to "tree changed" and the Stop hook back to typecheck, though no code changed.

## 2026-11-13 — English in code, one build in gate, closed API prefixes

- Comments, script and linter messages, test names and workflow steps are in English; `npm run comments:check` (in `check` and CI) reports Cyrillic in comments, migrations merged before the rule are skipped. Error texts of the audit functions are English through a new migration `20261112235110_audit_messages_in_english.sql`; merged migrations are not edited.
- `npm run gate` builds once: `check` runs under `scripts/with-local-supabase.mjs` (`NEXT_PUBLIC_*` are inlined at build time) and e2e starts that build (`E2E_PREBUILT=1`); `check` runs `tsc --noEmit` because `lint` already ran `next typegen`.
- `/api/vitals` and the client Web Vitals report are removed; `/api/webhooks/` is no longer public: only `/`, `/login` and `/api/cron/` skip the session check. A webhook gets its own prefix together with a signature check.
- Local Supabase is lighter: realtime, vector buckets, edge runtime and analytics are disabled in `supabase/config.toml`.
- `main` of every page takes the full width it is given (`w-full`); `checkPageQuality` checks it, and the 404 page is in `ui-quality.spec.ts`.
- `npm run totp` and `npm run seed:test-user` take the secret from the environment when there is no `.env.test.local`.
- The gate fingerprint copies the index with its original mtime, so a same-size edit within the same second is not missed.
- `tsconfig.json` excludes `.next/dev`: after `next dev` without API routes its generated `validator.ts` broke `tsc` (unused import under `@tsconfig/strictest`).
- Rules: the admin client and RLS bypass live in `security.md` only, cron in `architecture.md`.

## 2026-11-12 — CI at checkpoints, gate fingerprint, knowledge limits, rules split

Entries are in English from this one on; earlier entries are not translated.

- CI: heavy checks (speed budget, `generator:check`) run at checkpoints — push to `main`, a PR leaving draft (`ready_for_review`), a weekly schedule. gitleaks and actionlint run as binaries verified by SHA-256, with no license key; every checkout has `persist-credentials: false`; `db.yml` gets the PR base commit from checkout instead of a later `git fetch`.
- `npm run gate` writes a working-tree fingerprint to the git directory (`scripts/gate-stamp.mjs`, `scripts/gate-fingerprint.mjs`) when the tree did not change during the run; `npm run gate:quick -- <e2e files>` is the reduced set; `gate:db` is the database part of both.
- `npm run docs:check` (in `check` and CI): size limits of the knowledge files and the links between `docs/architecture.md` and the decision journal; a `docs/architecture.md` skeleton.
- `npm run ci:usage`: Actions minutes for the month and a forecast; included minutes come from `CI_INCLUDED_MINUTES` (3000 by default).
- Rules split by size: `db.md` → `db.md`, `db-tables.md`, `db-money.md`; `security.md` → `security.md`, `auth.md`.
- `CLAUDE.md`: review by risk in the task path (a risky task gets `/code-review high` and an agent running the `/security-review` prompt on the task diff), windows by token count, `gate:quick`; `docs/release.md`: gitleaks scans every branch, how to find the branch of a finding.
- `.mcp.json`: the remote Context7 server (`https://mcp.context7.com/mcp`), no `npx` package outside the lock file.
- For a project created earlier: delete the `GITLEAKS_LICENSE` secret; take a block PR out of draft before merging, otherwise `generator:check` and the speed check are skipped; turn rebase merging off (`docs/github/branch-protection.json`); copy the scripts, workflows and the rules split.

## 2026-11-11 — выпуск в production на GitHub Team: подтверждение — слияние PR

- На плане Team в приватном репозитории у окружений нет required reviewers и таймера ожидания (они — только в публичном репозитории или на Enterprise), поэтому выпуск подтверждается слиянием PR `main → production` в защищённую ветку `production`, а окружение `production` принимает только эту ветку: `docs/release.md`, B00-T01 и README блока B00, комментарий в `deploy-db.yml`. В `docs/release.md` — минуты Actions на Team ( в месяц, около 3000 минут Linux).
- Задача «Закрытие блока» в `docs/blocks/_template/tasks.md` включает `npm run perf`, как и список проверок в `CLAUDE.md`.
- Проекту, созданному раньше: убрать required reviewer у окружения `production`, если он был задан, и перенести тексты.

## 2026-11-11 — Drizzle убран: приложение работает с базой только через API Supabase

- Удалены `src/shared/infrastructure/db/` (`db()` и рукописная копия таблиц `schema.ts`), `drizzle.config.ts`, команды `db:generate` и `db:studio`, пакеты `drizzle-orm`, `drizzle-kit` и `dotenv` (его читал только `drizzle.config.ts`), override `@esbuild-kit/core-utils`. Причина: у `db()` не было ни одного вызова, копию таблиц ничто не сверяло с миграциями, а приложение ходит в базу через API Supabase с токеном пользователя — иначе RLS не действует. Что вместо него и как вернуть прямой SQL-клиент, если проекту он понадобится, — `.claude/rules/db.md`.
- `postgres` — в devDependencies: нужен только скриптам `db-types.mjs` и `seed-test-user.mjs` и `seedOwnedRows` (`tests/e2e/support/users.ts`, строки для `npm run perf`), адрес локальной базы им передаёт `with-local-supabase.mjs`. `DATABASE_URL` и `DATABASE_CA_CERT` убраны из `env.ts`, `env.d.ts`, `.env.example` и документов выпуска.
- Удалён браузерный клиент `src/shared/infrastructure/supabase/client.ts`: его никто не импортировал, а `connect-src 'self'` не пускает браузер к Supabase.
- Линтер: сняты части защит, сторожившие только удалённое, — `sql.raw` в `local/data-access`, путь `infrastructure/db` в запрете обхода RLS и в `local/dynamic-import`, `env.databaseUrl`, пакет `drizzle-orm/postgres-js` в `local/raw-client`. Вместо них — `local/direct-database`: импорт `postgres`, `pg` и `drizzle-orm` закрыт во всём `src`, включая `shared/infrastructure` (раньше `postgres` там был разрешён), `import type`, реэкспорт и `import()` тоже; без драйвера в `src` запреты `sql.raw` и `env.databaseUrl` сторожить нечего.
- `allowScripts`: запись `esbuild` убрана — пакет был в дереве только из-за `drizzle-kit`.
- Проекту, созданному раньше: если `db()` нигде не вызывается — удалить то же и убрать `DATABASE_URL` из `.env.local`; если вызывается — оставить и записать причину строкой D-NNN.

## 2026-11-11 — замер скорости в Playwright вместо Lighthouse CI

- `npm run perf` — тест Playwright (`tests/perf`, `playwright.perf.config.ts`): страницы production-сборки в Chromium на компьютере и телефоне, три прогона, медиана против порога, таблица «страница × профиль × величина». Пороги прежние (TTFB 200 мс; LCP 1,5 и 2,5 с; TBT 200 и 400 мс; CLS 0,1; оценка 0,9) и новый — «данные пришли» ≤ 500 мс (от начала перехода до строки из базы в документе, без троттлинга). Пороги и список страниц — один файл `tests/perf/pages.ts`.
- Страница за входом меряется с сессией пользователя со вторым фактором и на таблице в 50 тыс. строк: `seedOwnedRows` (`tests/e2e/support/users.ts`) вставляет их одной командой SQL, `deleteTestUser` убирает.
- TBT считается до окна тишины, как TTI у Lighthouse: после загрузки 5 с без долгих задач и без завершённых запросов. Долгая задача, начатая через 0,7 с после загрузки (ленивый график, таблица), попадает в замер; прогон всех страниц — около трёх минут вместо минуты.
- Троттлинг настоящий, через протокол DevTools, с константами Lighthouse (телефон: 562,5 мс на запрос, 1,47 Мбит/с, процессор ×4); сервер меряется отдельным заходом без троттлинга. Проверяется медиана, а не лучший из трёх прогонов, как делал LHCI по умолчанию.
- Убраны `@lhci/cli` (234 пакета в lock-файле), `lighthouserc.cjs`, `lighthouserc.mobile.cjs`, override `basic-ftp`, `.lighthouseci` в `.gitignore` и `.prettierignore`, e2e-замер TTFB главной с порогом 1000 мс (`build.spec.ts`). Шаг CI — «Speed budget», на сборке шага e2e.
- Генератор дописывает страницу модуля в `MEASURED_PAGES`; `npm run generator:check` меряет её на 50 тыс. строк (плюс около 30 секунд).
- Проекту, созданному раньше: перенести `tests/perf/`, `playwright.perf.config.ts`, `seedOwnedRows`, скрипт `perf`, шаг CI и `'tests/perf/**/*.ts'` в `eslint.config.mjs`; удалить `@lhci/cli`, оба `lighthouserc*.cjs` и override `basic-ftp`; вписать свои страницы в `MEASURED_PAGES`.

## 2026-11-11 — генератор полного среза и его проверка

- Генератор: `npm run new:module <модуль> <запись>` создаёт полный рабочий срез одной сущности из шаблонов `scripts/module-template/` (настоящие файлы с метками вместо имён): четыре слоя и `server.ts`, форма с ключом повтора и ошибкой сервера у формы, список со скелетоном, словарь, action, страница, одна миграция таблицы (политики владельца, второй фактор, права по колонкам, журнал, запрет `truncate`, индексы, проверки), её pgTAP, unit-тесты и e2e с `checkPageQuality` на странице с данными — 20 файлов, около 1 250 строк; страницу и таблицу сам дописывает в `SIGNED_IN_PAGES` и `OWNED_TABLES`. Раньше — 10 файлов и около 100 строк, только список.
- Проверка шаблонов: `npm run generator:check` создаёт модуль `generator-probes`, применяет миграцию, прогоняет линтер, самопроверку защит, типы, unit с порогами, knip, jscpd, prettier, advisors, db lint, pgTAP, Squawk, e2e модуля на двух устройствах и бюджет JS, затем удаляет модуль и таблицу; в CI — последний шаг задания `e2e`, в `npm run gate` не входит.
- Прерывание и чужие файлы: `generator:check` держит снимок изменяемых файлов и список созданных в `node_modules/.cache/generator-check/snapshot.json` — проверку, прерванную без уборки (SIGHUP от закрытого терминала обрабатывается как SIGINT; `kill -9`, падение), следующий запуск сначала возвращает по нему. До любой уборки проверяет, что база отвечает; остатки модуля без снимка, расхождение файлов миграций с базой (свой неприменённый черновик) она называет и останавливается, ничего не удаляя; удаляет только созданное в этом запуске. При грязном дереве сообщение об упавшем шаге называет и незакоммиченные правки. Генератор не принимает имя `generator-probes`, имена, которые шаблоны используют сами (`items`, `result`, `promise`…), и имя из одной буквы.
- Общий код: ключ повтора формы — `keepRequestId` и `resetRequestId` (`src/shared/ui/form/request-id.ts`), иначе вторая форма денег дублирует первую (jscpd); таблицы с владельцем для e2e — список `OWNED_TABLES` и `insertOwnedRows` в `tests/e2e/support/users.ts`.
- Правила: новая сущность — три задачи (база и pgTAP; ядро и unit; экран и e2e) поверх среза из генератора (`.claude/rules/docs.md`); после удаления примера `notes` исполняемый образец — шаблоны генератора, а не история git (B00-T03); тесты pgTAP таблиц продукта — с номера `100`.
- Проекту, созданному раньше: перенести `scripts/module-template/`, `scripts/new-module.mjs`, `scripts/generator-check.mjs`, скрипт `generator:check` и шаг CI, исключение шаблонов в `eslint.config.mjs` и `tsconfig.json`, `request-id.ts`, `OWNED_TABLES` и `insertOwnedRows`.

## 2026-11-10 — третья перепроверка: функции базы закрыты, линтер ловит ошибки денег и доступа, одно «готово», исполнимые задачи B00

- База: новая функция в `public` недоступна `anon` и `authenticated` (`*_functions_closed_by_default.sql`: `alter default privileges for role postgres revoke execute on functions from public`; функции, которую зовёт политика или клиент через `rpc`, нужен явный `grant execute`), pgTAP `006`; `audit.record()` берёт `row_id` из строки до изменения и запрещает смену `id` (`*_audit_record_identity.sql`, pgTAP `007`); общий pgTAP `900-table-conventions.sql` проверяет соглашения у каждой таблицы `public`, исключения — списком в самом тесте с номером D-NNN.
- Образец `notes`: `insert` и `update` — по колонкам (`*_notes_column_grants.sql`); валюта рядом с суммой без значения по умолчанию и ключ повтора `client_request_id` с `unique (owner_id, client_request_id)` (`*_notes_currency_and_request_id.sql`); форма создаёт ключ в обработчике отправки и показывает ошибку сервера у самой формы; e2e «ответ потерян, форма отправлена снова».
- Деньги: `formatMoney` требует валюту (значения «€» по умолчанию нет); `isIsoCurrency`, `currencyFractionDigits` (`src/shared/domain/currency.ts`) и `exceedsCurrencyPrecision` (`money.ts`) — 100,50 для JPY отклоняется; `npm run db:types` оставляет `numeric` в `Row` числом и делает строкой в `Insert` и `Update` — забытый `::text` стал ошибкой компилятора, `numeric` с `null` больше не роняет скрипт.
- Линтер: защиты `local/*` — сумма числом, операторы на `Money`, чистое ядро, Server Action мимо `authActionClient`, `verifySession` и `actionClient` вне модуля `auth`, свой клиент базы, ответ Supabase без проверки `error`, непроверенный `Result`, `throw` в use case, плановая задача без секрета, `enum`; отключение защиты комментарием `eslint-disable` — ошибка (`no-restricted-disable`); `npm run lint:rules` (в `check` и CI) — самопроверка на пробах `tests/lint-rules/fixtures`. Меньше шума на хорошем коде: числа в объектах, остаток деструктуризации, `||` у строк, `tabIndex` с `role="region"`, ссылка `// D-NNN: …`. `date-fns` убран из пакетов ядра.
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
- Линтер после ревью: отключение защиты комментарием — ошибка `npm run lint` и для `eslint-disable` (`no-restricted-disable`), и для `/* eslint правило: "off" */` (`no-use`), а то же вместе с отключением самих этих проверок находит второй проход `npm run lint:rules` по `src` без учёта комментариев; защиты ловят ошибку, а не намеренный обход — его смотрит ревью кода; новые правила `local/action-client`, `local/dynamic-import`, `local/no-unchecked-response`; плановая задача — проверка секрета первым оператором; защиты доступа действуют и в `src/shared/ui`; `amount: number | null`; самопроверка видит снятие запрета обхода RLS, `decimal.js`, `process.env` и областей правил.
- База после ревью: pgTAP `002` (второй фактор) и `003` (журнал) работают на своих таблицах и остаются после удаления примера — удаляются только `001`, `004`, `005`; `900` проверяет `security definer` функции для `authenticated` (вызовы `auth.uid()` и `private.mfa_ok()` в теле), колоночные права на служебные колонки и домены над `numeric`; исключение может назвать `таблица.колонка`; `npm run db:types` не пропускает молча таблицу в кавычках, `numeric[]` и функции с `numeric`.
- Поставка после ревью: npm не ниже 11.19 — `engines.npm` и `engine-strict` (более старый npm останавливает установку, а не выполняет install-скрипты); Claude Code не запускает `supabase migration up`, `test db`, `db lint`, `db advisors` с `--remote`, `--linked`, `--db-url`; `deploy-db.yml` — только ветки (не теги) `main` и `production`, открытый порт при `SUPABASE_NETWORK_RESTRICTED=true` — ошибка, возврат ограничений с повтором.
- После повторного ревью: `local/no-unchecked-response` ловит запись с выброшенным ответом, запрос без `await` и под `void`, ответ, возвращённый из `async`-функции, и чтение `status` до проверки `error` (`no-floating-promises` — с `checkThenables`); путь импорта — в нормальной форме и не за пределы `src` (`local/import-path`); `require()` в списке неотключаемых, `node:module` запрещён в `src`; в `src` только `.ts` и `.tsx` (`local/typescript-only`), запрет инфраструктуры в `shared/lib` действует и на `.tsx`; `local/cron-secret` покрывает группы маршрутов и `route.tsx` и требует `isCronRequest` из `@/shared/lib/cron`. `money()` на нечисловой строке бросает ошибку без значения, `reportUnexpectedError` не отдаёт в Sentry поля брошенного объекта. `npm run db:types` читает исключения `rpc_numeric` так же, как тест `900`, и останавливается на колонке составного типа с `numeric`; `rpc_checks` в `900` не засчитывает проверку, названную только в строке.
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
