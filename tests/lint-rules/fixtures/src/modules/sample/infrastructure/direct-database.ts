import type { Sql } from 'postgres' // expect: local/direct-database

import { Pool } from 'pg' // expect: local/direct-database

export { drizzle } from 'drizzle-orm/postgres-js' // expect: local/direct-database

export async function rawRows(sql: Sql, pool: Pool) {
  const { default: connect } = await import('postgres') // expect: local/direct-database
  return [sql, pool, connect]
}
