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

- Опорные файлы: `src/shared/lib/safe-action.ts` (`authActionClient`, `actionClient`, `fail`, `handleServerError`), `src/shared/lib/session.ts` (`verifySession`, `requireVerifiedSession`), `src/shared/infrastructure/env.ts`. Без `import 'server-only'` — только `*.fake.ts` и браузерный клиент `src/shared/infrastructure/supabase/client.ts`.
- `process.env` читают только `env.ts` и `isProduction` из `src/shared/lib/runtime.ts` (линтер `no-restricted-properties`). Клиенту понадобится `NEXT_PUBLIC_*` — обёртка в `src/shared/lib`; `NODE_ENV` на клиенте допустим.
- Мимо RLS ходят `db()` из `src/shared/infrastructure/db` (локально и в CI) и `createAdminClient()` из `src/shared/infrastructure/supabase/admin.ts` (секретный ключ, серверные задачи без сессии): линтер `no-restricted-imports` пускает их только в `src/shared/infrastructure/**`, `*.admin.ts` и `src/app/api/cron/**`; данные пользователя — всегда через клиент с сессией и явным фильтром по владельцу.
- Сессия: cookie Supabase `httpOnly`, в продакшене `secure`, кроме `localhost` — e2e production-сборки идёт по http, а Safari не хранит `Secure` cookie без https (`src/shared/infrastructure/supabase/cookie-options.ts`); браузерный клиент Supabase работает без сессии. `src/proxy.ts` передаёт заголовки кэша Supabase (сессия не попадает в CDN) и без переменных окружения отвечает 503 на непубличные адреса.
- Неожиданные ошибки — `reportUnexpectedError` (`src/shared/infrastructure/monitoring.ts`): строка JSON в лог и Sentry; Sentry только серверный (`src/instrumentation.ts`, `beforeSend` убирает заголовки, cookies и тело запроса), клиентский SDK не ставить — бюджет JS. Ошибки репозиториев — без `cause` и без текста ошибки базы: в `details` Postgres бывает вся строка с суммами.
- Заголовки — в `next.config.ts`. CSP строгий во всех директивах, кроме `script-src 'self' 'unsafe-inline'`: App Router вставляет в каждую страницу инлайн-скрипты (тема, загрузчик, данные серверных компонентов), разрешить их без `'unsafe-inline'` может только nonce, а nonce требует рендерить каждую страницу на запрос (`await connection()`) и отказаться от статической оболочки Cache Components; `experimental.sri` инлайн-скрипты не покрывает (проверено в шаблоне). Проект, где все экраны за входом, может выбрать nonce — задача B00-T07. `tests/e2e/ui-quality.spec.ts` проверяет заголовок и отсутствие нарушений CSP в консоли на каждой странице. `form-action` — с доменом Supabase, если вход через OAuth.
- Server Actions за прокси с другим хостом — `serverActions.allowedOrigins`, иначе проверка `Origin` их отклонит.
- Drizzle `sql` — только с интерполяцией значений внутри шаблона; строки в SQL не склеиваются.
- Файлы: имя генерирует сервер, путей из запроса нет.
- Пользователи только приглашением: `enable_signup = false` в `supabase/config.toml`, в проекте — Authentication → Sign In / Providers → «Allow new users to sign up» = off. Публичный ключ лежит в бандле: с открытой регистрацией любой станет `authenticated`, а политики написаны `to authenticated`.
- Пароль от 12 символов с буквами и цифрами, смена пароля — с недавним входом, сессия — не дольше 24 ч и 8 ч без активности (`supabase/config.toml`, в облако — `deploy-db.yml`); в проекте Supabase включить защиту от утёкших паролей.
- Второй фактор: `verifySession()` → `{ userId, aal, hasVerifiedFactor }`; шаг (`pendingMfaStep`, `src/shared/domain/mfa.ts`) проверяют `src/proxy.ts`, `authActionClient` и `requireVerifiedSession()` — его зовут страницы и серверные компоненты за входом (редирект на шаг), `verifySession()` без проверки шага — только экраны `/mfa/*` и их actions на `mfaActionClient`. В production без переменной `AUTH_REQUIRE_MFA` второй фактор обязателен (выключается только явным `false`); финансовые проекты держат `AUTH_REQUIRE_MFA=true` и в Preview. Один фактор на пользователя (`max_enrolled_factors = 1` в `supabase/config.toml`), пока нет экрана факторов. Ошибка Supabase Auth при чтении факторов (бан, отозванная сессия) — это «сессии нет»: `/login`, не 500.
- Перебор: 429 от Supabase Auth → `TooManyAttemptsError` (`src/modules/auth/domain/errors.ts`); неверный пароль, неверный код и 429 шлюзы пишут строкой `{ "type": "auth-failure", "code" }` и событием Sentry `auth-failure` (`reportAuthFailure`), порог оповещения — правило в Sentry. Лимиты Supabase Auth считаются по IP, а с сервера Vercel адрес один на всех пользователей: блокировка по пользователю (MFA verification hook Supabase или свой счётчик) — задача проекта до запуска.
- Периметр Cloudflare Access: либо `proxy.ts` проверяет `Cf-Access-Jwt-Assertion` (jose, JWKS `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, `aud` приложения), либо `*.vercel.app` закрыт Deployment Protection — иначе Access обходится по адресу деплоя.
- Зависимости: красный `npm audit --omit=dev --audit-level=high` в CI — обновить пакет, а если исправления нет — временный `overrides` в `package.json` с причиной и датой пересмотра. Мажоры — руками после чтения changelog (Dependabot их пропускает).

Подробно: скилы `dev-kit:nextjs-data-security`, `dev-kit:supabase-rls-drizzle`, `dev-kit:clean-layers`.
