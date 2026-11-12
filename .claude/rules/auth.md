---
paths:
  - 'src/modules/auth/**'
  - 'src/app/*/login/**'
  - 'src/app/*/mfa/**'
  - 'src/proxy.ts'
  - 'src/shared/lib/session.ts'
  - 'src/shared/lib/safe-action.ts'
  - 'src/shared/domain/mfa.ts'
  - 'supabase/config.toml'
---

# Вход: приглашения, пароль, второй фактор, перебор

- Пользователи только приглашением: `enable_signup = false` в `supabase/config.toml`, в проекте — Authentication → Sign In / Providers → «Allow new users to sign up» = off. Публичный ключ лежит в бандле: с открытой регистрацией любой станет `authenticated`, а политики написаны `to authenticated`.
- Пароль от 12 символов с буквами и цифрами, смена пароля — с недавним входом, сессия — не дольше 24 ч и 8 ч без активности (`supabase/config.toml`, в облако — `deploy-db.yml`); в проекте Supabase включить защиту от утёкших паролей.
- Второй фактор: `verifySession()` → `{ userId, aal, hasVerifiedFactor }`; шаг (`pendingMfaStep`, `src/shared/domain/mfa.ts`) проверяют `src/proxy.ts`, `authActionClient` и `requireVerifiedSession()` — его зовут страницы и серверные компоненты за входом (редирект на шаг), `verifySession()` без проверки шага — только экраны `/mfa/*` и их actions на `mfaActionClient`; вне модуля `auth` импорт `verifySession`, `actionClient`, `mfaActionClient` и `setupActionClient` запрещает линтер (`local/behind-sign-in`), а каждый экспорт файла `'use server'` обязан быть цепочкой одного из четырёх клиентов `safe-action.ts` (`local/server-action`, действует и в `src/shared/ui`); свой клиент модуль собрать не может — пакет `next-safe-action` импортирует только `src/shared/lib/safe-action.ts` (`local/action-client`; хуки `next-safe-action/hooks` и типы доступны всем). В production без переменной `AUTH_REQUIRE_MFA` второй фактор обязателен (выключается только явным `false`); финансовые проекты держат `AUTH_REQUIRE_MFA=true` и в Preview. Один фактор на пользователя (`max_enrolled_factors = 1` в `supabase/config.toml`), пока нет экрана факторов. Ошибка Supabase Auth при чтении факторов (бан, отозванная сессия) — это «сессии нет»: `/login`, не 500.
- Украденный пароль без второго фактора (сессия `aal1` у пользователя с подтверждённым фактором), запросы напрямую в Supabase Auth мимо приложения. Не может: снять фактор, сменить пароль или почту, подключить новый фактор — Auth отвечает `insufficient_aal`; это закреплено e2e «a stolen password alone cannot…» в `tests/e2e/mfa.spec.ts`. Может: записать `user_metadata` и разлогинить владельца везде (`signOut` с областью `global`) — это найдено пробой, тестом не закреплено. Поэтому на `user_metadata` не опирается ничто: ни политика, ни проверка права, ни экран — его меняет и сессия `aal1`; роли и права — только в таблицах под RLS.
- Перебор: 429 от Supabase Auth → `TooManyAttemptsError` (`src/modules/auth/domain/errors.ts`); неверный пароль, неверный код и 429 шлюзы пишут строкой `{ "type": "auth-failure", "code" }` (`reportAuthFailure`); в Sentry уходит событие `auth-failure` только при срабатывании лимита Supabase Auth (`too-many-*`) — это и есть признак подбора, а квота событий не сгорает на каждой неверной попытке; правило оповещения — в Sentry. Лимиты Supabase Auth считаются по IP, а с сервера Vercel адрес один на всех пользователей: блокировка по пользователю (MFA verification hook Supabase или свой счётчик) — задача проекта до запуска.

Сессия, proxy, Route Handlers, ошибки и CSP — `security.md`.

Подробно: скилы `dev-kit:nextjs-data-security`, `dev-kit:supabase-rls`.
