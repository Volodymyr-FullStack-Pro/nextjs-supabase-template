import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { databaseError } from '@/shared/infrastructure/supabase/postgres-errors'

const ENTRY_COLUMNS = 'id, title'

type EntryRow = { id: string; title: string }

export async function listUnchecked(supabase: SupabaseClient): Promise<EntryRow[]> {
  const result = await supabase.from('entries').select(ENTRY_COLUMNS).overrideTypes<EntryRow[]>()
  return result.data ?? [] // expect: local/no-unchecked-response
}

export async function countUnchecked(supabase: SupabaseClient): Promise<number> {
  const result = await supabase.from('entries').select('id', { count: 'exact', head: true })
  return result['count'] ?? 0 // expect: local/no-unchecked-response
}

export async function listByThen(supabase: SupabaseClient): Promise<EntryRow[]> {
  return supabase
    .from('entries')
    .select(ENTRY_COLUMNS)
    .overrideTypes<EntryRow[]>()
    .then(({ data }) => data ?? []) // expect: local/no-unchecked-response
}

export async function listLater(supabase: SupabaseClient): Promise<EntryRow[]> {
  const result = await supabase.from('entries').select(ENTRY_COLUMNS).overrideTypes<EntryRow[]>()
  const { data } = result // expect: local/no-unchecked-response
  return data ?? []
}

export async function listCheckedTooLate(supabase: SupabaseClient): Promise<EntryRow[]> {
  const result = await supabase.from('entries').select(ENTRY_COLUMNS).overrideTypes<EntryRow[]>()
  const rows = result.data ?? [] // expect: local/no-unchecked-response
  if (result.error) throw databaseError('entries.list', result.error)
  return rows
}

export async function closeDiscarded(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from('entries').update({ closed: true }).eq('id', id) // expect: local/no-unchecked-response
}

export function closeNeverSent(supabase: SupabaseClient, id: string): void {
  supabase.from('entries').update({ closed: true }).eq('id', id) // expect: local/no-unchecked-response, @typescript-eslint/no-floating-promises
}

export function closeVoided(supabase: SupabaseClient, id: string): void {
  void supabase.from('entries').update({ closed: true }).eq('id', id) // expect: local/no-unchecked-response
}

export async function closeRaw(supabase: SupabaseClient, id: string) {
  return supabase.from('entries').update({ closed: true }).eq('id', id) // expect: local/no-unchecked-response
}

export const closeRawByArrow = async (supabase: SupabaseClient, id: string) =>
  supabase.from('entries').update({ closed: true }).eq('id', id) // expect: local/no-unchecked-response

export async function closeAwaitedRaw(supabase: SupabaseClient, id: string) {
  return await supabase.from('entries').delete().eq('id', id) // expect: local/no-unchecked-response
}

export async function removeStatusOnly(supabase: SupabaseClient, id: string): Promise<number> {
  const result = await supabase.from('entries').delete().eq('id', id)
  return result.status // expect: local/no-unchecked-response
}

export async function removeStatusDestructured(
  supabase: SupabaseClient,
  id: string,
): Promise<number> {
  const { status } = await supabase.from('entries').delete().eq('id', id) // expect: local/no-unchecked-response
  return status
}
