'use client'

/** Неожиданные ошибки сегмента. Ожидаемые (валидация, нет прав) возвращаются из actions как значения. */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Что-то пошло не так</h1>
      <p className="text-sm text-neutral-600">
        Попробуйте ещё раз. Если повторяется, сообщите администратору.
      </p>
      <button type="button" onClick={reset} className="w-fit rounded-md border px-3 py-2">
        Повторить
      </button>
    </main>
  )
}
