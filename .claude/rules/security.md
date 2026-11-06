---
paths:
  - "src/app/**"
  - "src/features/**"
  - "src/data/**"
  - "proxy.ts"
---

# Безопасность данных (Next.js App Router)

- Запросы к базе — только в `src/data/*`, каждый файл начинается с `import 'server-only'`. Компоненты и actions вызывают DAL.
- Только DAL читает секреты и `DATABASE_URL`; `process.env` в `src/app` и `src/features` — только `NEXT_PUBLIC_*` через `src/lib/env.ts`.
- Каждый Server Action: `verifySession()` → роль → владение объектом (IDOR) → запись. Проверка на странице или в layout его не защищает: action вызывается прямым POST.
- `proxy.ts` обновляет сессию и редиректит, но не является единственной защитой.
- Входы (`formData`, `searchParams`, JSON) — через Zod `safeParse`; ожидаемые ошибки возвращаются как значения (`{ error }`), неожиданные ловят `error.tsx` / `global-error.tsx`.
- Наружу из DAL — DTO с перечисленными полями, не строки таблиц. `userId` — только из сессии.

Подробно: скил `dev-kit:nextjs-data-security`.
