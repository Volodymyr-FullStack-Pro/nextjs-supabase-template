import 'server-only'

import { createClient } from '@supabase/supabase-js' // expect: local/raw-client

import { env } from '@/shared/infrastructure/env'

type Row = { id: string; amount: string }

export async function listEverything(): Promise<Row[]> {
  const admin = createClient(env.supabaseUrl(), env.supabaseSecretKey()) // expect: no-restricted-properties
  const { data } = await admin.from('entries').select('id, amount') // expect: local/data-access
  return data as Row[] // expect: @typescript-eslint/no-unsafe-type-assertion
}

export async function countAll(): Promise<number> {
  const admin = createClient(env.supabaseUrl(), env.supabasePublishableKey())
  const { count } = await admin.from('entries').select('id', { count: 'exact' }) // expect: local/data-access
  const everything = await admin.from('entries').select('*') // expect: local/data-access
  const embedded = await admin.from('entries').select('id, owner(*)') // expect: local/data-access
  const inserted = await admin.from('entries').insert({ amount: '1' }).select() // expect: local/data-access
  const session = await admin.auth.getSession() // expect: local/data-access
  const found = [everything.data, embedded.data, inserted.data, session.data.session]
  return (count ?? 0) + found.length
}

export function orderBy(sql: { raw(text: string): string }, column: string): string {
  return sql.raw(column) // expect: local/data-access
}
