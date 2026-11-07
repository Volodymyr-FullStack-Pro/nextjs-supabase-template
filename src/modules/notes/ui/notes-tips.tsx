import { cacheLife, cacheTag } from 'next/cache'

import { NOTE_TITLE_MAX } from '../domain/note'

export async function NotesTips() {
  'use cache'
  cacheLife('days')
  cacheTag('notes-tips')
  const tips = [
    `Заголовок до ${String(NOTE_TITLE_MAX)} символов`,
    'Поиск ищет по подстроке',
    'Видны только свои заметки',
  ]
  return (
    <ul className="list-disc pl-5 text-sm text-muted-foreground">
      {tips.map((tip) => (
        <li key={tip}>{tip}</li>
      ))}
    </ul>
  )
}
