---
paths:
  - "src/app/**"
  - "src/features/**/*.tsx"
---

# Интерфейс

- Серверные компоненты по умолчанию; `'use client'` только там, где нужны состояние, эффекты или события. Клиентские компоненты не импортируют `src/data` и `src/db`.
- Данные грузятся параллельно (`Promise.all`), без водопадов; формы — через `useActionState` и Server Actions.
- Доступность: семантические теги, `label` у каждого поля, `role="alert"` для ошибок, фокус и клавиатура работают.
- Суммы показываются через `formatMoney` из `src/lib/money.ts`, с валютой и знаком.
- Стили — Tailwind, токены проекта в `src/app/globals.css`; никаких инлайновых цветов.

Подробно: скилы `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`.
