import 'server-only'

import { createHash, timingSafeEqual } from 'node:crypto'

import { env } from '@/shared/infrastructure/env'

const digest = (value: string) => createHash('sha256').update(value).digest()

export function isCronRequest(request: Request): boolean {
  const secret = env.cronSecret()
  const authorization = request.headers.get('authorization')
  if (!secret || authorization === null) return false
  return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))
}
