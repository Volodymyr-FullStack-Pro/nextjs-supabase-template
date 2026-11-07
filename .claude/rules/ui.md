---
paths:
  - 'src/app/**'
  - 'src/modules/**/ui/**'
  - 'src/shared/ui/**'
---

# Интерфейс

- Серверные компоненты по умолчанию; `'use client'` только там, где нужны состояние, эффекты или события, и только у листьев. Клиентские компоненты не импортируют `infrastructure` и `server.ts`.
- Страница — статическая оболочка плюс `<Suspense>` вокруг всего, что читает сессию, cookies или `searchParams`; справочники — `'use cache'` с `cacheLife` и `cacheTag`. Тяжёлые компоненты (графики, таблицы, редакторы) — через `next/dynamic`.
- Компоненты — shadcn/ui в `src/shared/ui` (добавлять `npx shadcn@latest add <имя>`; локальные правки под strict TS — `field.tsx`, `sonner.tsx`, `card.tsx` — вернуть после `add --overwrite`); составные общие — в `src/shared/ui/<область>`, компоненты домена — в `ui/` модуля.
- Формы: react-hook-form + Zod-схема из `domain` модуля (та же схема у action; нормализация текста — в схеме через `normalizeText`, для textarea — `normalizeMultiline`), поля через `TextField`, отправка `useHookFormAction`, кнопка — `SubmitButton` из `src/shared/ui/form/submit-button.tsx` с `pending={action.isPending}`: пока action идёт, кнопка заблокирована, `aria-busy`, спиннер и текст «Сохраняю…», повторные нажатия на сервер не уходят; ошибки полей под полем (`FieldError`), ошибки сервера — `toast.error`, успех — `toast.success` и `resetFormAndAction`; список обновляется через `useOptimistic`/`useTransition`, чтобы интерфейс отвечал сразу.
- Повторные действия: поиск и фильтры — nuqs с `limitUrlUpdates: debounce(...)`, не на каждый символ; любая кнопка действия — `disabled` на время `isPending` (`useAction`/`useTransition`); действие, которое создаёт запись о деньгах или внешнюю операцию, несёт `clientRequestId` (uuid, создаётся при открытии формы) и на сервере идемпотентно (правило в `db.md`), чтобы двойной клик, повтор после обрыва сети или F5 не создали дубль.
- Фильтры, период, выбранный объект — в URL через nuqs (`useQueryState` с `shallow: false` и `limitUrlUpdates: debounce(...)` для серверных перечитываний; loader на сервере). Глобального стора нет, пока нет доказанной нужды.
- Без водопадов: независимые запросы — `Promise.all`; в клиент передаются только нужные поля.
- Даты — date-fns с локалью `ru`; суммы — `formatMoney` из `src/shared/domain/money.ts`.
- Тема — класс `dark` (next-themes); цвета только через токены из `src/app/globals.css`, никаких инлайновых цветов.
- Доступность: семантические теги, `FieldLabel` у каждого поля, `aria-invalid` и `FieldError`, фокус и клавиатура работают.

Подробно: скилы `vercel-react-best-practices`, `vercel-composition-patterns`, `web-design-guidelines`, `dev-kit:performance-budget`.
