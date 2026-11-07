import { cacheLife, cacheTag } from 'next/cache'

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
