import Link from 'next/link'

/** Публичная страница: без запросов к Supabase, работает и в клоне без .env.local. */
export default function Home() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Шаблон работает</h1>
      <p className="text-neutral-600">
        Next.js 16, Supabase, Drizzle, строгий TypeScript, тесты трёх слоёв и настройки Claude Code.
        Замените этот текст на свой проект.
      </p>
      <ul className="list-disc pl-5 text-neutral-700">
        <li>
          <Link href="/login" className="underline">
            Вход
          </Link>{' '}
          — форма входа через Supabase Auth (нужен .env.local)
        </li>
        <li>
          <Link href="/notes" className="underline">
            Заметки
          </Link>{' '}
          — защищённая страница с Server Action, DAL и RLS
        </li>
      </ul>
    </main>
  )
}
