'use client'

const MESSAGE_MAX_WIDTH_PX = 560

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ru">
      <body>
        <main
          style={{ maxWidth: MESSAGE_MAX_WIDTH_PX, margin: '48px auto', fontFamily: 'system-ui' }}
        >
          <h1>Приложение не смогло запуститься</h1>
          <button type="button" onClick={reset}>
            Повторить
          </button>
        </main>
      </body>
    </html>
  )
}
