// Переменные окружения читаются лениво: сборка и публичные страницы работают без них,
// ошибка возникает только там, где значение действительно нужно.
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Не задана переменная окружения ${name} (см. .env.example)`)
  return value
}

export const env = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: () =>
    required(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  databaseUrl: () => required('DATABASE_URL', process.env.DATABASE_URL),
  /** true, если Supabase настроен — публичные страницы и proxy работают и без него. */
  hasSupabase: () =>
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
}
