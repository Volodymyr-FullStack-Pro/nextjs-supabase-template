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
- Суммы — `formatMoney(amount, { currency, locale, fractionDigits })` из `src/shared/domain/money.ts` (Intl, неразрывные пробелы, настоящий минус); ввод суммы — `TextField` с `inputMode="decimal"` и `parseDecimalInput` в Zod-схеме (принимает «1 234,56»). Даты — `formatDate` из `src/shared/domain/time.ts` с часовым поясом проекта (`APP_TIME_ZONE`), не в часовом поясе сервера; учётные периоды (месяц, день закрытия) — колонка `date`, моменты — `timestamptz`. Строки интерфейса — через словарь, когда проект на нескольких языках (next-intl): в разметке нет текста, который нельзя перевести, длинный английский не обрезается.
- Таблицы: числа вправо, `tabular-nums`, одинаковое число знаков в колонке, единица (валюта, %) в заголовке, не в каждой ячейке; `<caption>` или `aria-label`, `th scope`, `aria-sort` у сортируемых колонок, липкий заголовок у длинных; на телефоне — прокрутка внутри контейнера или карточки вместо строк; отрицательное — со знаком, не только цветом.
- React Compiler включён: `useMemo`, `useCallback` и `memo` руками не пишутся, кроме случаев, которые компилятор пропускает (он сообщает об этом в сборке).
- Дизайн-система — `docs/design/design-system.md` (выбор заказчика, роли цветов, шрифт, радиусы, состояния); значения живут токенами в `src/app/globals.css`, тема — класс `dark` (next-themes). Цвет значением в коде (hex, rgb, hsl, oklch) — ошибка линтера; новый цвет — сначала роль в дизайн-системе и токен. Акцент — только главное действие.
- У экрана с данными есть состояния загрузки (скелетон), пусто, ошибки, нет прав; у кнопки — фокус, занята, недоступна.
- Доступность WCAG 2.2 AA: семантические теги, `FieldLabel` у каждого поля, `aria-invalid` и `FieldError`, видимый фокус, клавиатура, смысл не только цветом, касание ≥ 44 px на телефоне. Автопроверка — `tests/e2e/ui-quality.spec.ts` (axe в светлой и тёмной теме, без горизонтальной прокрутки); новую страницу добавить в его список.
- Каждый экран проверяется на телефоне 390 px (iPhone Safari) и компьютере 1440 px (Chrome): e2e идёт в обоих проектах Playwright, визуальная проверка перед остановкой задачи — тоже.

Подробно: скилы `dev-kit:design-system`, `frontend-design`, `web-design-guidelines`, `vercel-react-best-practices`, `vercel-composition-patterns`, `dev-kit:performance-budget`.
