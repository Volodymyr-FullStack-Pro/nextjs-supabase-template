---
paths:
  - 'src/app/**'
  - 'src/modules/**'
  - 'src/shared/lib/**'
  - 'src/proxy.ts'
---

# Безопасность данных (Next.js App Router)

- Запросы к базе — только в репозиториях `src/modules/*/infrastructure/*` и `src/shared/infrastructure/*`, каждый файл начинается с `import 'server-only'`. Компоненты и actions ходят в данные через use cases из `server.ts` модуля.
- Только `shared/infrastructure` читает `process.env` (`env.ts`), и границы не пускают `ui` и `app` в `shared/infrastructure`. Если клиенту понадобится `NEXT_PUBLIC_*`, заводится обёртка в `shared/lib`; `NODE_ENV` на клиенте допустим (подставляется при сборке).
- Каждый Server Action создаётся через `authActionClient` из `src/shared/lib/safe-action.ts`: middleware проверяет сессию, action получает `ctx.session`; дальше use case проверяет роль и владение объектом (IDOR) до записи. Публичные действия (вход) — `actionClient`. Проверка на странице или в layout action не защищает: он вызывается прямым POST.
- `src/proxy.ts` обновляет сессию и редиректит, но не является единственной защитой.
- Входы — Zod: `inputSchema` у action (схема из `domain`), loader nuqs для `searchParams`, `safeParse` для JSON вне actions. Ошибка для пользователя — `Result` из use case и `fail(error)` в action (текст ошибки домена безопасен), всё остальное наружу уходит общей фразой из `handleServerError`; неожиданные ловят `error.tsx` / `global-error.tsx`.
- Наружу из репозиториев — модели домена с перечисленными полями, не строки таблиц. `userId` — только из сессии.
- Пользовательские данные читаются user-scoped клиентом Supabase (RLS применяется); прямое подключение `db()` — только для серверных задач и с явным фильтром по владельцу.

- Заголовки безопасности (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS) заданы в `next.config.ts` для всех маршрутов, `poweredByHeader` выключен; CSP с nonce подключается через `proxy.ts`, когда появятся сторонние скрипты.
- Повторы: действие, которое пользователь может повторить, идемпотентно (`clientRequestId` + `unique` в базе, правило в `db.md`); кнопка отправки блокируется на время action (`SubmitButton`).

Подробно: скилы `dev-kit:nextjs-data-security`, `dev-kit:clean-layers`.
