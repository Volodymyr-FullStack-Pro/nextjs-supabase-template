---
paths:
  - 'src/app/**'
  - 'src/modules/**/ui/**'
  - 'src/shared/ui/**'
---

# Интерфейс

- shadcn/ui — в `src/shared/ui` (`npx shadcn@latest add <имя>`); локальные правки вернуть после `add --overwrite`: `field.tsx`, `sonner.tsx`, `card.tsx` (strict TS), `button.tsx` и `input.tsx` (фокус — общий контур 2px из `globals.css` без `outline-none`, hover — `--primary-hover`).
- Форма — по образцу `src/modules/notes/ui/notes-form.tsx`: `useHookFormAction`, поле — `TextField` (`src/shared/ui/form/text-field.tsx`, уже ставит `FieldLabel`, `aria-invalid`, `FieldError`), кнопка — `SubmitButton` (`src/shared/ui/form/submit-button.tsx`) с `pending={action.isPending}`; тексты ошибок — словарь модуля `ui/messages.ts`: `TextField messages={…}` и `toast.error(failureMessage(error.serverError, …))` (`src/shared/ui/form/messages.ts`), а в форме денег ещё и сообщение у самой формы; успех — `toast.success` и `resetFormAndAction`.
- Любая кнопка действия, не только отправка формы, — `disabled` на время `isPending` (`useAction`, `useTransition`). У действия, которое создаёт запись о деньгах или внешнюю операцию, `clientRequestId` (uuid) создаётся при открытии формы.
- Фильтры, период, выбранный объект — в URL через nuqs: `useQueryState` с `shallow: false` и `limitUrlUpdates: debounce(...)`, loader на сервере (образец — `src/modules/notes/ui/notes-search.tsx`). Глобального стора нет, пока нет доказанной нужды.
- Суммы — `formatMoney` (код не из ISO 4217, например `USDT`, `BTC`, — число и тикер, до 8 знаков) из `src/shared/domain/money.ts` и `parseDecimalInput(raw, SCALE.…)` из `src/shared/domain/decimal-input.ts` (без decimal.js — годится для клиентской схемы), ввод — `TextField` с `inputMode="decimal"`. Даты — `formatDate` из `src/shared/domain/time.ts` в `APP_TIME_ZONE`, не в часовом поясе сервера.
- С next-intl в разметке нет текста, который нельзя перевести; длинный английский не обрезается.
- Таблицы: числа вправо, `tabular-nums`, одинаковое число знаков в колонке, единица (валюта, %) — в заголовке, не в ячейке; `<caption>` или `aria-label`, `th scope`, `aria-sort` у сортируемых колонок, липкий заголовок у длинных; на телефоне — прокрутка внутри контейнера (`tabIndex={0}` и подпись) или карточки; отрицательное — со знаком, не только цветом.
- Новая страница — в `tests/e2e/ui-quality.spec.ts`: публичная в `PUBLIC_PAGES`, за входом в `SIGNED_IN_PAGES` (пользователь `alice` из setup-проекта `tests/e2e/auth.setup.ts`, `storageState`).

Подробно: скилы `dev-kit:design-system`, `dev-kit:performance-budget`, `dev-kit:money-decimal`.
