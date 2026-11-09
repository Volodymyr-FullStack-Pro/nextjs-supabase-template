# Выпуск

Путь кода: локально → preview на каждый PR → staging → production. Production выпускает человек.

## Среды

| Среда      | Код                | База                | Для чего                             |
| ---------- | ------------------ | ------------------- | ------------------------------------ |
| Локально   | `npm run dev`      | `supabase start`    | разработка, тесты                    |
| Preview    | каждый PR (Vercel) | Supabase staging    | показать задачу по ссылке            |
| Staging    | ветка `main`       | Supabase staging    | проверка перед выпуском              |
| Production | ветка `production` | Supabase production | пользователи, только реальные данные |

Preview работает с базой staging, а миграции попадают туда только после слияния в `main`: задачу с новой миграцией по ссылке preview не показать до слияния блока — её проверяют локально, а заказчику показывают на staging после слияния.

Приложение и база — в одном регионе: функции Vercel во Франкфурте (`fra1` в `vercel.json`), проекты Supabase — в регионе Frankfurt (eu-central-1). Регион проекта Supabase выбирается при создании и потом не меняется.

## Настройка один раз

1. **Supabase.** Два проекта, staging и production, в регионе Frankfurt; в production включить PITR. В каждом: Authentication → Sign In / Providers → «Allow new users to sign up» = off. Только в облаке, через панель (в `config.toml` этой настройки нет): защита от утёкших паролей (Authentication → Providers → Email → «Prevent use of leaked passwords», тариф Pro и выше). Второй фактор (TOTP) из `config.toml` работает на всех тарифах; финансовым проектам в Vercel — `AUTH_REQUIRE_MFA=true`. Ограничения сессий из `config.toml` (`[auth.sessions]`: 24 ч всего, 8 ч без активности; финансовым проектам — `inactivity_timeout = "30m"` и `jwt_expiry = 900`: бездействие проверяется только при обновлении токена, фактический срок — таймаут плюс срок токена) облако принимает на тарифе Pro и выше: на Free секцию `[auth.sessions]` убрать, иначе `config push` откажет.
2. **Vercel.** Settings → Environments → Production → Branch Tracking — ветка `production`; домен staging назначить на ветку `main`; переменные окружения — отдельно для Preview и Production (`.env.example`). `DATABASE_URL` — пул Supavisor в режиме transaction, порт 6543 (Supabase → Connect → Transaction pooler). Регион функций берётся из `vercel.json`.
3. **GitHub.** Ветка `production` — `git push origin main:production`. Защитить `main` и `production` (только PR, зелёный CI); в настройках слияния оставить squash и merge commit. Два окружения (Settings → Environments): `staging` и `production`, у `production` — обязательное подтверждение (required reviewers). В каждом — секреты `SUPABASE_ACCESS_TOKEN` (Supabase → Account → Access Tokens), `SUPABASE_DB_PASSWORD`, `SUPABASE_PROJECT_REF` и переменная `SITE_URL` (адрес приложения в этой среде, `https://…`). Пока секретов нет, выкладка базы пропускается с предупреждением; когда они заданы — первая выкладка вручную: Actions → Deploy database → Run workflow на `main`.
   Порт Postgres закрыт сетевыми ограничениями (Database → Network Restrictions, приложение ходит только через HTTPS API)? Переменная окружения `SUPABASE_NETWORK_RESTRICTED=true`: `deploy-db.yml` на время `link` и `db push` добавляет IP раннера (`/32`), а после — даже если выкладка упала — возвращает сохранённый список целиком.
   Токен `SUPABASE_ACCESS_TOKEN` тогда должен иметь право менять сетевые ограничения проекта (роль Owner или Administrator в организации Supabase); `[db.network_restrictions]` в `config.toml` оставить `enabled = false`, иначе `config push` перепишет список.
4. **Sentry** — до первого выпуска в production. Организацию создавать в регионе данных EU: регион выбирается при создании организации и потом не меняется, а ошибки несут адреса страниц и технические данные пользователей из ЕС. В Vercel: `SENTRY_DSN`, для staging ещё `SENTRY_ENVIRONMENT=staging`; для читаемого стека — `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` (source maps уходят при сборке; без них сборка тоже проходит). Подключён только серверный SDK (`src/instrumentation.ts`): ошибки серверных компонентов, Route Handlers, `proxy.ts` и неожиданные ошибки Server Actions. Клиентского SDK нет: он добавил бы десятки килобайт JS на каждую страницу и вывел бы маршруты за бюджет (`npm run budget`); ошибки в браузере ловят `error.tsx` и `global-error.tsx`.
5. **Логи** — одна строка JSON на событие (`{ type, …, durationMs }`) через `console.info` / `console.error`, без персональных данных, сумм и токенов: так их читают Vercel и поиск по логам. Ожидаемые ошибки (правило домена, неверный ввод) в лог не пишутся; неожиданная ошибка Server Action — строка `{ "type": "action-error", "error", "message" }` и событие в Sentry (`src/shared/lib/safe-action.ts`).

## Миграции

1. Локально: `supabase migration new <имя>` → SQL → `supabase test db` → `npm run db:types` → PR (CI `db.yml` проверяет advisors, pgTAP и что типы совпадают с миграциями).
2. Слияние в `main` → workflow `deploy-db.yml` сам выкладывает на staging: `supabase link`, `supabase db push --remote`, `supabase config push` (настройки Auth и API из `config.toml`; `site_url` и адреса возврата подменяются переменной `SITE_URL`). Проверить staging.
3. Перед первым включением выкладки посмотреть, что `config push` поменяет в облаке: `supabase link --project-ref <staging>` и `supabase config diff` (CLI 3 подставляет в настройки переменные `SUPABASE_*` из окружения и `.env`-файлов — diff показывает и их).
4. Миграция только добавляет (новые колонки и таблицы), удаление — отдельным выпуском, когда код старое уже не читает: при выпуске база выходит после кода (её выкладка ждёт подтверждения), поэтому новый код должен работать и со старой схемой; иначе миграция — отдельным выпуском раньше кода.

## Выпуск в production

PR `main → production` сливается merge commit, не squash (иначе `production` расходится с `main` и следующий выпуск конфликтует), с описанием «что выходит» (блоки, требования), CI зелёный → слияние человеком → Vercel деплоит код, а `deploy-db.yml` ждёт подтверждения в окружении `production` и выкладывает миграции и настройки Auth. Упавшую выкладку повторить: Actions → Deploy database → Run workflow на ветке `production`.

## Откат

- Код — Vercel Instant Rollback на предыдущий деплой.
- База — новая миграция, исправляющая вперёд; авария с данными — восстановление PITR.
- Причина и вывод — строка D-NNN в `docs/knowledge/decisions.md`.

`ADDITIONAL_REDIRECT_URLS` (переменная окружения GitHub, необязательно) — адреса возврата после входа через `config push`, через запятую; для staging добавьте маску адресов preview Vercel (например `https://*-<команда>.vercel.app/**`), иначе вход через SSO на preview вернёт на staging. Без неё — только `SITE_URL`.
