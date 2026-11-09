import type { AuthGateway } from './auth-gateway'

export function makeSignOut({ auth }: { auth: Pick<AuthGateway, 'signOut'> }) {
  return (): Promise<void> => auth.signOut()
}
