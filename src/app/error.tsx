'use client'

import { Button } from '@/shared/ui/button'

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">Что-то пошло не так</h1>
      <p className="text-sm text-muted-foreground">
        Попробуйте ещё раз. Если повторяется, сообщите администратору.
      </p>
      <Button type="button" variant="outline" className="w-fit" onClick={reset}>
        Повторить
      </Button>
    </main>
  )
}
