import 'server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '@/shared/infrastructure/env'
import { isLocalHost } from '@/shared/infrastructure/local-host'

import * as schema from './schema'

type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>
let cached: DrizzleDatabase | undefined

function sslFor(url: string) {
  if (isLocalHost(new URL(url).hostname)) return false
  const ca = env.databaseCaCert()
  return ca === undefined ? 'verify-full' : { ca, rejectUnauthorized: true }
}

function connect(url: string) {
  return postgres(url, { prepare: false, max: 1, ssl: sslFor(url) })
}

export function db(): DrizzleDatabase {
  cached ??= drizzle(connect(env.databaseUrl()), { schema })
  return cached
}
