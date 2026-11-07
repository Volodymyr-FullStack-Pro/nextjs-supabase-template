export interface AuthGateway {
  signInWithPassword(credentials: { email: string; password: string }): Promise<boolean>
}
