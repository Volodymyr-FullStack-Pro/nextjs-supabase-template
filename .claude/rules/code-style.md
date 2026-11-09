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
- Нормализация текста — `src/shared/domain/text.ts`: `normalizeText`, `normalizeMultiline` (textarea), `normalizeSearch` (поиск, в use case), `hasLettersOrDigits`.

Подробно: скил `dev-kit:code-style`.
