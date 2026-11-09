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

- Опорные файлы: `src/shared/lib/safe-action.ts` (`authActionClient`, `actionClient`, `fail`, `handleServerError`), `src/shared/infrastructure/env.ts`. Без `import 'server-only'` — только `*.fake.ts`, `env.ts` и браузерный клиент `src/shared/infrastructure/supabase/client.ts`.
- `process.env` читают только `env.ts` и `isProduction` из `src/shared/lib/runtime.ts` (линтер `no-restricted-properties`). Клиенту понадобится `NEXT_PUBLIC_*` — обёртка в `src/shared/lib`; `NODE_ENV` на клиенте допустим.
- `db()` из `src/shared/infrastructure/db` обходит RLS: только `src/shared/infrastructure/**` и `*.admin.ts` (линтер `no-restricted-imports`), только для серверных задач и с явным фильтром по владельцу.
- Сессия: cookie Supabase `httpOnly`, в продакшене `secure` (`src/shared/infrastructure/supabase/cookie-options.ts`); браузерный клиент Supabase работает без сессии. `src/proxy.ts` передаёт заголовки кэша Supabase (сессия не попадает в CDN) и без переменных окружения отвечает 503 на непубличные адреса.
- Заголовки — в `next.config.ts`. CSP без nonce: nonce делает все страницы динамическими и ломает статическую оболочку Cache Components; `script-src` — через хэши (`experimental.sri`), когда понадобится; `form-action` — с доменом Supabase, если вход через OAuth.
- Server Actions за прокси с другим хостом — `serverActions.allowedOrigins`, иначе проверка `Origin` их отклонит.
- Drizzle `sql` — только с интерполяцией значений внутри шаблона; строки в SQL не склеиваются.
- Файлы: имя генерирует сервер, путей из запроса нет.
- Пользователи только приглашением: `enable_signup = false` в `supabase/config.toml`, в проекте — Authentication → Sign In / Providers → «Allow new users to sign up» = off. Публичный ключ лежит в бандле: с открытой регистрацией любой станет `authenticated`, а политики написаны `to authenticated`.
- Пароль от 12 символов (`supabase/config.toml`); в проекте Supabase включить защиту от утёкших паролей; для финансовых данных — второй фактор (TOTP) и `aal2` в политиках RLS.
- Перебор: 429 от Supabase Auth → `TooManyAttemptsError` (`src/modules/auth/domain/errors.ts`).
- Периметр Cloudflare Access: либо `proxy.ts` проверяет `Cf-Access-Jwt-Assertion` (jose, JWKS `https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`, `aud` приложения), либо `*.vercel.app` закрыт Deployment Protection — иначе Access обходится по адресу деплоя.
- Зависимости: красный `npm audit --omit=dev --audit-level=high` в CI — обновить пакет, а если исправления нет — временный `overrides` в `package.json` с причиной и датой пересмотра. Мажоры — руками после чтения changelog (Dependabot их пропускает).

Подробно: скилы `dev-kit:nextjs-data-security`, `dev-kit:supabase-rls-drizzle`, `dev-kit:clean-layers`.
