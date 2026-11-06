# Документация и процесс

- Знания проекта — в `docs/knowledge/`: `README.md` (статус, ссылки, люди), `decisions.md` (журнал D-NNN: что, кто, когда, почему), `open-questions.md`. После любого решения — строка в `decisions.md`.
- Дорожная карта — `docs/roadmap.md`: спринты и эпики с чекбоксами; обновляется в конце задачи, не автоматически.
- Спецификации и планы — `docs/superpowers/specs/` и `docs/superpowers/plans/` (скилы `brainstorming`, `writing-plans`, `executing-plans`).
- Состояние сессии — `.claude/handoff.md` (команда `/dev-kit:handoff`, чтение `/dev-kit:resume`).
- `CLAUDE.md` — не длиннее 200 строк; только то, чего нельзя вывести из кода; архитектуру не пересказывать.
- Карточки задач (если проект ведётся в ClickUp): параметры в `.claude/rules/clickup.md`, шаблон — скил `dev-kit:clickup-card`.
- Перед PR: `/simplify` → `/code-review` → `/security-review` для auth, денег, миграций (скил `dev-kit:review-checklist`).
