declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL?: string
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
      DATABASE_URL?: string
      DATABASE_CA_CERT?: string
      SENTRY_DSN?: string
      AUTH_REQUIRE_MFA?: string
    }
  }
}

export {}
