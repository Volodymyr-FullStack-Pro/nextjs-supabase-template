/** Порт провайдера аутентификации: application не знает, что за ним Supabase. */
export interface AuthGateway {
  signInWithPassword(credentials: { email: string; password: string }): Promise<boolean>
}
