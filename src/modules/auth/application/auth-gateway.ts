export type SignInOutcome = 'signed-in' | 'invalid-credentials' | 'too-many-attempts'

export interface AuthGateway {
  signInWithPassword(credentials: { email: string; password: string }): Promise<SignInOutcome>
  signOut(): Promise<void>
}
