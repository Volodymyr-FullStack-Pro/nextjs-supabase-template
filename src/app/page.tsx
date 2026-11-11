import Link from 'next/link'

export default function Home() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Шаблон работает</h1>
      <p className="text-muted-foreground">
        Next.js 16, Supabase, строгий TypeScript, тесты трёх слоёв и настройки Claude Code. Замените
        этот текст на свой проект.
      </p>
      <ul className="list-disc pl-5 text-foreground">
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
          — защищённая страница: use case, репозиторий с RLS, Server Action (без входа уведёт на
          /login)
        </li>
      </ul>
    </main>
  )
}
