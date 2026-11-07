import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { env } from '@/shared/infrastructure/env'
import * as schema from './schema'

type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>
let cached: DrizzleDatabase | undefined

/**
 * Прямое подключение к Postgres через Drizzle. Внимание: оно идёт мимо RLS (роль postgres),
 * поэтому используется только для серверных задач (импорт, отчёты, миграции), а пользовательские
 * запросы идут через репозитории модулей (infrastructure) на клиенте Supabase, где RLS применяется.
 */
export function db(): DrizzleDatabase {
  cached ??= drizzle(postgres(env.databaseUrl(), { prepare: false }), { schema })
  return cached
}
