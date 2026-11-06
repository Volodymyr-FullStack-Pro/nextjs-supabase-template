---
paths:
  - 'src/app/**'
  - 'src/features/**/*.tsx'
  - 'src/components/**'
---

# Интерфейс

- Серверные компоненты по умолчанию; `'use client'` только там, где нужны состояние, эффекты или события. Клиентские компоненты не импортируют `src/data` и `src/db`.
- Компоненты — shadcn/ui в `src/components/ui` (Base UI, lucide-react): добавлять через `npx shadcn@latest add <имя>`, править только под строгий TypeScript и токены; свои составные — в `src/components/<область>`. Локальные правки реестра, которые CLI затрёт при повторном `add --overwrite`: `field.tsx` (`uniqueErrors.length === 1`), `sonner.tsx` (сужение `theme`), `card.tsx` (`font-heading` вместо несуществующего `cn-font-heading`).
- Формы: react-hook-form + Zod-схема из `src/features/<домен>/schema.ts` (та же схема стоит на входе action), поля через `TextField` (`src/components/form`), отправка через `useHookFormAction`. Ошибки полей — под полем (`FieldError`), ошибки сервера — `toast.error`, успех — `toast.success` (sonner).
- Фильтры, период, выбранный объект — в URL через nuqs (`useQueryState` на клиенте, loader на сервере), а не в глобальном состоянии. Глобального стора нет, пока нет доказанной нужды.
- Даты — date-fns с локалью `ru`; суммы — `formatMoney` из `src/lib/money.ts`, с валютой и знаком.
- Тема — класс `dark` (next-themes); цвета только через токены из `src/app/globals.css` (`bg-background`, `text-muted-foreground` и т. п.), никаких инлайновых цветов.
- Доступность: семантические теги, `FieldLabel` у каждого поля, `aria-invalid` и `FieldError` для ошибок, фокус и клавиатура работают.

Подробно: скилы `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`.
