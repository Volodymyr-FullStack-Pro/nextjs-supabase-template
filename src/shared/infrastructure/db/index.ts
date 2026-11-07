import 'server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { env } from '@/shared/infrastructure/env'

import * as schema from './schema'

type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>
let cached: DrizzleDatabase | undefined

export function db(): DrizzleDatabase {
  cached ??= drizzle(postgres(env.databaseUrl(), { prepare: false }), { schema })
  return cached
}
