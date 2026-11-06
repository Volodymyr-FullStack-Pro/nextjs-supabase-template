'use client'

/** Ошибки корневого layout: рендерится без него, поэтому содержит html и body. */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ru">
      <body>
        <main style={{ maxWidth: 560, margin: '48px auto', fontFamily: 'system-ui' }}>
          <h1>Приложение не смогло запуститься</h1>
          <button type="button" onClick={reset}>
            Повторить
          </button>
        </main>
      </body>
    </html>
  )
}
