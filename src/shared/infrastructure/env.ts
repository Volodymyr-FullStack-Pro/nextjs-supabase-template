export class EnvironmentError extends Error {
  override readonly name = 'EnvironmentError'
}

function required(name: string, value: string | undefined): string {
  if (!value)
    throw new EnvironmentError(`Не задана переменная окружения ${name} (см. .env.example)`)
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
  sentryDsn: () => process.env.SENTRY_DSN ?? '',
  authRequireMfa: () => process.env.AUTH_REQUIRE_MFA === 'true',
  hasSupabase: () =>
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
}
