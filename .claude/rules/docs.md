---
paths:
  - 'docs/**'
  - 'CLAUDE.md'
  - '.claude/**'
---

# Документация и процесс

- Решения: `docs/knowledge/decisions.md` — индекс, строка не длиннее двух предложений. Решение, меняющее архитектуру, стек, процесс, безопасность или деньги, — плюс ADR `docs/knowledge/decisions/D-NNN.md` (контекст, альтернативы, последствия) по шаблону `decisions/_template.md`. Заменённые строки после 100-й уходят в `decisions/archive.md`.
- `CLAUDE.md` — не длиннее 200 строк: только то, чего нельзя вывести из кода; архитектуру не пересказывать.

Подробно: путь задачи, блоки, ветки и PR — скил `dev-kit:delivery`; ответы заказчика — `dev-kit:requirements-register`; карточки ClickUp — `dev-kit:clickup-card`.
