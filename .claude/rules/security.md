---
paths:
  - 'src/app/**'
  - 'src/features/**'
  - 'src/data/**'
  - 'src/proxy.ts'
---

# Безопасность данных (Next.js App Router)

- Запросы к базе — только в `src/data/*`, каждый файл начинается с `import 'server-only'`. Компоненты и actions вызывают DAL.
- Только DAL читает секреты и `DATABASE_URL`; `process.env` в `src/app` и `src/features` — только `NEXT_PUBLIC_*` через `src/lib/env.ts`.
- Каждый Server Action создаётся через `authActionClient` из `src/lib/safe-action.ts`: middleware проверяет сессию, action получает `ctx.session`; дальше роль → владение объектом (IDOR) → запись. Публичные действия (вход) — `actionClient`. Проверка на странице или в layout action не защищает: он вызывается прямым POST.
- `src/proxy.ts` обновляет сессию и редиректит, но не является единственной защитой.
- Входы — Zod: `inputSchema` у action, `safeParse` для `searchParams` и JSON вне actions. Ошибка для пользователя — `throw new ActionError('…')` (уходит в `result.serverError`), всё остальное наружу общей фразой; неожиданные ловят `error.tsx` / `global-error.tsx`.
- Наружу из DAL — DTO с перечисленными полями, не строки таблиц. `userId` — только из сессии.

Подробно: скил `dev-kit:nextjs-data-security`.
