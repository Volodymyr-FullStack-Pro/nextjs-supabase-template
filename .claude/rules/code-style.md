---
paths:
  - 'src/**'
  - 'scripts/**'
  - 'tests/**'
---

# Стиль кода

- Пороги и запреты — блок «Стиль кода» в `eslint.config.mjs`. Красный линтер — чинить причину, не отключать правило.
- Деньги (`local/*`, блок «Защита денег и доступа» там же): сумма, цена, остаток, курс, количество, доля — строка или `Money`, не `number` (и не `number | null`, не необязательное `number`) и не `z.number()`; арифметика и сравнение — методами `money()`, не операторами (`local/money-as-number`, `local/no-money-operators`); `domain` и `application` не превращают строки в числа и не читают часы — целое пишется `Number.parseInt(x, 10)`, «сейчас» приходит параметром (`local/pure-core`); число для графика — `money(a).toNumber()` в `ui`; `enum` нет (`local/no-enum`). Как исправить — говорит сообщение правила.
- Исключения для имён (`_`, `z`, `err`, `props`, `ctx`, `db` и другие) — в `id-length` и `unicorn/name-replacements` там же.
- `@typescript-eslint/no-magic-numbers`: число в выражении получает имя; в объекте имя числу даёт ключ (`{ EUR: 2, JPY: 0 }`) — числа в объектах и в JSX-атрибутах линтер пропускает, их смотрит ревью.
- `max-lines` 300 — потолок, не цель; честно длинный файл с одной ответственностью (справочник, таблица констант) — `/* eslint-disable max-lines -- причина */` в первой строке.
- Комментариев нет: `local/no-comments` в `src`, `scripts` и `tests` пропускает только директивы инструментов и ссылку на решение `// D-041: налог округляется один раз`. Причина решения — строка D-NNN в `docs/knowledge/decisions.md` (крупное — ADR в `decisions/`), в коде — только её номер. Корневые конфиги и SQL комментировать можно.
- 0 — настоящее значение (сумма, количество): `??` вместо `||` (у строк `||` можно: пустая строка и «нет значения» — одно и то же), у чисел — явное сравнение (`count !== 0`), не `if (count)` (`prefer-nullish-coalescing`, `strict-boolean-expressions`); в JSX — `{count > 0 ? <X /> : null}`, не `{count && <X />}`, иначе на экране «0» (`react/jsx-no-leaked-render`).
- Ключ списка — id записи, не индекс (`react/no-array-index-key`); у `<button>` всегда `type` (`react/button-has-type`).
- Логи — `console.info` / `console.error` одной строкой JSON (`docs/release.md`, «Логи»); `console.log` запрещён (`no-console`).
- `eslint-disable` — только с именем правила и причиной: `// eslint-disable-next-line <правило> -- <причина>`; директива без причины или лишняя — ошибка. Защиты ловят ошибку — разработчика или ИИ-агента, — а не намеренный обход: правило видит формы кода из своих проб (`tests/lint-rules/fixtures`), а кто захочет обойти — найдёт форму, которой там нет; это смотрит ревью кода. Отключить защиту комментарием ESLint — ошибка; защиты — список `UNDISABLEABLE` в `eslint.config.mjs`: `boundaries/*`, `no-restricted-imports`, `no-restricted-properties`, `local/*` (кроме `local/no-comments`), `no-explicit-any`, `consistent-type-assertions`, `no-require-imports`. Что именно проверяется: `eslint-disable` защиты ловит `no-restricted-disable`; комментарий-конфигурацию `/* eslint правило: "off" */` — `no-use` (из комментариев ESLint разрешены только `eslint-disable*` и `eslint-enable`); оба — в `npm run lint`, в том числе в `src/shared/ui`. Сами эти два правила тоже отключаются комментарием — такое двойное отключение `npm run lint` не видит, его находит `npm run lint:rules` (входит в `check` и CI): он линтует весь `src` с `allowInlineConfig: false`, где комментарии не действуют, и падает на любом сообщении защиты. Правку самого `eslint.config.mjs`, проб и `check.mjs` не ловит ничто, кроме ревью диффа. Запреты импорта сверяют текст пути, поэтому путь пишется в нормальной форме и не выходит за `src` (`local/import-path`), `require()` запрещён (`no-require-imports`, `node:module`), а в `src` лежат только `.ts` и `.tsx` (`local/typescript-only`) — на другие файлы защиты не действуют. Ложное срабатывание защиты — правка правила в `eslint.config.mjs` вместе с пробой в `tests/lint-rules/fixtures` (`npm run lint:rules`), а не обход.
- `as` на границе (`infrastructure`, `shared/lib`, `app/api`) не сужает тип: данные разбирает `Schema.parse(...)` (`no-unsafe-type-assertion`). Лишнее поле убирает остаток деструктуризации: `const { ownerId: _ownerId, ...note } = stored`.
- Тесты: без `.only` и безусловного `.skip`, без ожидания по таймеру (`waitForTimeout`), у каждого теста есть проверка, у Playwright-проверок — `await` (`@vitest/eslint-plugin`, `eslint-plugin-playwright`).
- Нормализация текста — `src/shared/domain/text.ts`: `normalizeText`, `normalizeMultiline` (textarea), `normalizeSearch` (поиск, в use case), `hasLettersOrDigits`.

Подробно: скил `dev-kit:code-style`.
