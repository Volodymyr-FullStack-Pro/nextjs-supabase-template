---
paths:
  - 'src/app/**'
  - 'src/modules/**'
  - 'src/shared/lib/**'
  - 'src/shared/infrastructure/**'
  - 'src/proxy.ts'
  - 'next.config.ts'
---

# Безопасность данных (Next.js App Router)

- Запросы к базе — только в репозиториях `src/modules/*/infrastructure/*` и `src/shared/infrastructure/*`; серверные файлы начинаются с `import 'server-only'` (кроме фейков `*.fake.ts`, `env.ts` и браузерного клиента `supabase/client.ts`). Компоненты и actions ходят в данные через use cases из `server.ts` модуля.
- Только `shared/infrastructure` читает `process.env` (`env.ts`), режим сборки — `isProduction` из `src/shared/lib/runtime.ts`; прямое `process.env` в остальном коде — ошибка линтера, и границы не пускают `ui` и `app` в `shared/infrastructure`. Если клиенту понадобится `NEXT_PUBLIC_*`, заводится обёртка в `shared/lib`; `NODE_ENV` на клиенте допустим (подставляется при сборке).
- Каждый Server Action создаётся через `authActionClient` из `src/shared/lib/safe-action.ts`: middleware проверяет сессию, action получает `ctx.session`; дальше use case проверяет роль и владение объектом (IDOR) до записи. Публичные действия (вход) — `actionClient`. Проверка на странице или в layout action не защищает: он вызывается прямым POST.
- `src/proxy.ts` обновляет сессию и редиректит, но не является единственной защитой.
- Входы — Zod: `inputSchema` у action (схема из `domain`), loader nuqs для `searchParams`, `safeParse` для JSON вне actions. Ошибка для пользователя — `Result` из use case и `fail(error)` в action (текст ошибки домена безопасен), всё остальное наружу уходит общей фразой из `handleServerError`; неожиданные ловят `error.tsx` / `global-error.tsx`.
- Наружу из репозиториев — модели домена с перечисленными полями, не строки таблиц. `userId` — только из сессии.
- Пользовательские данные читаются user-scoped клиентом Supabase (RLS применяется); прямое подключение `db()` — только для серверных задач и с явным фильтром по владельцу.

- XSS: HTML из строк не вставляется (`react/no-danger` — ошибка линтера), `eval` и `new Function` запрещены; текст пользователя выводится как текст, ссылки из данных — только `http(s)` после проверки схемы. Редиректы — только на свои относительные пути из кода (`redirect('/notes')`), никогда на значение из запроса без проверки, что путь начинается с `/` и не с `//`.
- SQL только параметризованный: клиент Supabase и Drizzle подставляют параметры сами; `sql\`…\``допустим лишь с интерполяцией значений внутри шаблона (Drizzle экранирует), строки в SQL не склеиваются; поисковые шаблоны`ilike` экранируются (`%`, `_`, `\\`), как в репозитории `notes`.
- CSRF: Server Actions проверяют `Origin` сами (за прокси с другим хостом — `serverActions.allowedOrigins`); изменяющие данные Route Handlers не заводятся, кроме `/api/webhooks/*` (проверка подписи отправителя, без cookie-сессии) и `/api/cron/*` (проверка `CRON_SECRET`); эти префиксы открыты в `proxy.ts`, поэтому проверка внутри обработчика обязательна.
- Секреты и логи: ключи только в переменных окружения через `env.ts`, в репозиторий не попадают (gitleaks в CI); в логи, тосты и ответы не выводятся токены, пароли, персональные данные и тексты исключений базы — пользователю уходит текст ошибки домена или общая фраза.
- Файлы (если появятся): только Supabase Storage с RLS, список допустимых типов и размер в Zod, имя файла генерируется на сервере; никаких путей из запроса.
- Пользователи только приглашением: саморегистрация в Supabase Auth выключена (Dashboard → Authentication → Sign In / Providers → «Allow new users to sign up» = off; локально `enable_signup = false` в `supabase/config.toml`). Публичный ключ лежит в бандле, и при включённой регистрации любой становится `authenticated`, а политики RLS написаны `to authenticated`.
- Периметр не на словах: если приложение закрыто Cloudflare Access (или аналогом), прямой доступ к origin исключён — либо `proxy.ts` проверяет `Cf-Access-Jwt-Assertion` (jose + JWKS `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, `aud` приложения), либо домены `*.vercel.app` закрыты Deployment Protection. Иначе Access обходится по адресу деплоя.
- Защита от перебора: вход — Supabase Auth с его лимитами попыток (429 → `TooManyAttemptsError` с понятным текстом); публичным действиям нужен лимит (`@upstash/ratelimit`, по мере надобности).
- Зависимости: production-зависимости без известных уязвимостей — `npm audit --omit=dev --audit-level=high` в CI (красный — обновить пакет или, если исправления ещё нет, временный `overrides` в `package.json` с комментарием и датой пересмотра); уязвимости в инструментах разработки (линтер, Lighthouse, CLI) не попадают к пользователям и закрываются через Dependabot (еженедельные обновления, оповещения и автоматические security-PR включены в настройках репозитория); версии закреплены lock-файлом, мажоры обновляются руками после чтения changelog; действия CI закреплены на SHA.
- Проверки: на каждом PR — Semgrep (`p/nextjs`, `p/typescript`, `p/react`), gitleaks, `npm audit signatures`; при изменениях базы — `supabase db advisors --fail-on warn` и pgTAP на политики; изменения auth, прав, денег, миграций и Server Actions проходят `/security-review`; плагин `security-guidance` подсказывает по ходу правок.
- Заголовки безопасности (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS) заданы в `next.config.ts` для всех маршрутов, `poweredByHeader` выключен; CSP без nonce (`frame-ancestors`, `object-src`, `base-uri`): nonce делает все страницы динамическими и ломает статическую оболочку Cache Components, поэтому `script-src` — через хэши (`experimental.sri`), когда понадобится; `form-action` — с доменом Supabase, если вход через OAuth.
- Сессия: cookie Supabase `httpOnly` и `secure` в продакшене (`src/shared/infrastructure/supabase/cookie-options.ts`) — скрипты страницы их не читают; браузерный клиент Supabase работает без сессии. `proxy.ts` передаёт заголовки кэша Supabase (сессия не попадает в CDN) и без переменных окружения закрывает непубличные адреса (503).
- Прямое подключение к базе (`db()`) обходит RLS: только в `src/shared/infrastructure/**` и файлах `*.admin.ts` (линтер). Пароль — от 12 символов (`supabase/config.toml`), в проекте Supabase включить защиту от утёкших паролей. Для финансовых данных — второй фактор (TOTP) и `aal2` в политиках RLS (Supabase Auth MFA).
- Повторы: действие, которое пользователь может повторить, идемпотентно (`clientRequestId` + `unique` в базе, правило в `db.md`); кнопка отправки блокируется на время action (`SubmitButton`).

Подробно: скилы `dev-kit:nextjs-data-security`, `dev-kit:clean-layers`.
