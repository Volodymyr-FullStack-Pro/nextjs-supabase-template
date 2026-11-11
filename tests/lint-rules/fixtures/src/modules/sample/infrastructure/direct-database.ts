import type { Sql } from 'postgres' // expect: local/direct-database

// @ts-expect-error -- pg в шаблоне не установлен, а запрет держит и его
import { Pool } from 'pg' // expect: local/direct-database

// @ts-expect-error -- drizzle-orm в шаблоне не установлен, а запрет держит и его
export { drizzle } from 'drizzle-orm/postgres-js' // expect: local/direct-database

export async function rawRows(sql: Sql, pool: Pool) {
  const { default: connect } = await import('postgres') // expect: local/direct-database
  return [sql, pool, connect]
}
