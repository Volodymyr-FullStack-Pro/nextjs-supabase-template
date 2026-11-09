import { isLocalHost } from '@/shared/infrastructure/local-host'

export function sessionCookieOptions(host: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && !isLocalHost(host),
    sameSite: 'lax',
  } as const
}
