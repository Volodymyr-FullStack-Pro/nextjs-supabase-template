import 'server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '@/shared/infrastructure/env'
import { isLocalHost } from '@/shared/infrastructure/local-host'

import * as schema from './schema'

type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>
let cached: DrizzleDatabase | undefined

function connect(url: string) {
  const ssl = isLocalHost(new URL(url).hostname) ? false : 'require'
  return postgres(url, { prepare: false, max: 1, ssl })
}

export function db(): DrizzleDatabase {
  cached ??= drizzle(connect(env.databaseUrl()), { schema })
  return cached
}
