import { __ENTITY_NAME___TITLE_MAX, type __EntityName__MessageKey } from '../domain/__entity-name__'

export const __moduleName__Messages = {
  '__entityName__.title.required': 'Введите название',
  '__entityName__.title.tooLong': `Не длиннее ${String(__ENTITY_NAME___TITLE_MAX)} символов`,
  '__entityName__.title.meaningless': 'Название должно содержать буквы или цифры',
  '__entityName__.amount.invalid': 'Введите сумму числом, например 1 234,56',
  '__entityName__.amount.tooPrecise': 'У этой валюты нет копеек: введите сумму без дробной части',
  '__entityName__.currency.invalid': 'Введите код валюты из трёх букв, например EUR',
  '__entityName__.request.reused':
    'Запись уже сохранена с прежними данными — она в списке. Нужна ещё одна запись с новыми данными — нажмите «Добавить» ещё раз.',
} as const satisfies Record<__EntityName__MessageKey, string>
