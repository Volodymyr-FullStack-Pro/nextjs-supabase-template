// Объявленные переменные окружения: позволяют обращаться через process.env.NAME при noPropertyAccessFromIndexSignature
// и дают Next.js подставить NEXT_PUBLIC_* в клиентский код.
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL?: string
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string
      DATABASE_URL?: string
    }
  }
}

export {}
