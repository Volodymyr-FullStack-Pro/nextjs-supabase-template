import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Страница не найдена</h1>
      <Link href="/" className="underline">
        На главную
      </Link>
    </main>
  )
}
