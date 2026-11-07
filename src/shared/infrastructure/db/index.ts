import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/shared/infrastructure/env'
import * as schema from './schema'

type Db = ReturnType<typeof drizzle<typeof schema>>
let cached: Db | undefined

/**
 * Прямое подключение к Postgres через Drizzle. Внимание: оно идёт мимо RLS (роль postgres),
 * поэтому используется только для серверных задач (импорт, отчёты, миграции), а пользовательские
 * запросы идут через клиент Supabase в src/data, где RLS применяется.
 */
export function db(): Db {
  cached ??= drizzle(postgres(env.databaseUrl(), { prepare: false }), { schema })
  return cached
}
