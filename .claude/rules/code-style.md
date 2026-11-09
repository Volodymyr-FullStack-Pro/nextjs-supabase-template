---
paths:
  - 'src/**'
  - 'scripts/**'
  - 'tests/**'
---

# Стиль кода

- Пороги и запреты — блок «Стиль кода» в `eslint.config.mjs`. Красный линтер — чинить причину, не отключать правило.
- Исключения для имён (`_`, `z`, `err`, `props`, `ctx`, `db` и другие) — в `id-length` и `unicorn/name-replacements` там же.
- `@typescript-eslint/no-magic-numbers` с `detectObjects`: число в объекте тоже получает имя (`{ status: HTTP_BAD_REQUEST }`). Числа в JSX-атрибутах линтер пропускает — их ловит ревью.
- `max-lines` 300 — потолок, не цель; честно длинный файл с одной ответственностью (справочник, таблица констант) — `/* eslint-disable max-lines -- причина */` в первой строке.
- Комментариев нет: `local/no-comments` в `src`, `scripts` и `tests` пропускает только директивы инструментов. Причина решения — строка D-NNN в `docs/knowledge/decisions.md` (крупное — ADR в `decisions/`), не в коде. Корневые конфиги и SQL комментировать можно.
- 0 — настоящее значение (сумма, количество): `??` вместо `||`, у чисел — явное сравнение (`amount !== 0`), не `if (amount)` (`prefer-nullish-coalescing`, `strict-boolean-expressions`); в JSX — `{count > 0 ? <X /> : null}`, не `{count && <X />}`, иначе на экране «0» (`react/jsx-no-leaked-render`).
- Ключ списка — id записи, не индекс (`react/no-array-index-key`); у `<button>` всегда `type` (`react/button-has-type`).
- Логи — `console.info` / `console.error` одной строкой JSON (`docs/release.md`, «Логи»); `console.log` запрещён (`no-console`).
- `eslint-disable` — только с именем правила и причиной: `// eslint-disable-next-line <правило> -- <причина>`; директива без причины или лишняя — ошибка.
- Тесты: без `.only` и безусловного `.skip`, без ожидания по таймеру (`waitForTimeout`), у каждого теста есть проверка, у Playwright-проверок — `await` (`@vitest/eslint-plugin`, `eslint-plugin-playwright`).
- Нормализация текста — `src/shared/domain/text.ts`: `normalizeText`, `normalizeMultiline` (textarea), `normalizeSearch` (поиск, в use case), `hasLettersOrDigits`.

Подробно: скил `dev-kit:code-style`.
