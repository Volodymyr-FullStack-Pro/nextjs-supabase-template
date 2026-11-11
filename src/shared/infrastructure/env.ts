import 'server-only'

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
  databaseCaCert: () => {
    const cert = process.env.DATABASE_CA_CERT
    return cert ? cert.replaceAll(String.raw`\n`, '\n') : undefined
  },
  supabaseSecretKey: () => required('SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY),
  sentryDsn: () => process.env.SENTRY_DSN,
  cronSecret: () => process.env.CRON_SECRET,
  authRequireMfa: () => {
    const value = process.env.AUTH_REQUIRE_MFA
    return process.env.NODE_ENV === 'production' ? value !== 'false' : value === 'true'
  },
  hasSupabase: () =>
    Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
}
