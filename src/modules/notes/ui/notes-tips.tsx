import { cacheLife, cacheTag } from 'next/cache'

/**
 * Пример кэшируемого компонента ('use cache'): попадает в статическую оболочку страницы и живёт сутки.
 * Так кэшируются справочники и редко меняющиеся данные; инвалидация — updateTag('notes-tips') в action (или revalidateTag('notes-tips', 'max')).
 * Данные пользователя (cookies, сессия) внутри 'use cache' читать нельзя — их место в компонентах под Suspense.
 */
// eslint-disable-next-line @typescript-eslint/require-await -- 'use cache' требует async-функцию
export async function NotesTips() {
  'use cache'
  cacheLife('days')
  cacheTag('notes-tips')
  const tips = ['Заголовок до 200 символов', 'Поиск ищет по подстроке', 'Видны только свои заметки']
  return (
    <ul className="list-disc pl-5 text-sm text-muted-foreground">
      {tips.map((tip) => (
        <li key={tip}>{tip}</li>
      ))}
    </ul>
  )
}
