import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import { databaseError } from '@/shared/infrastructure/supabase/postgres-errors'

const ENTRY_COLUMNS = 'id, amount::text'

type EntryRow = { id: string; amount: string }

export async function listEntries(supabase: SupabaseClient, userId: string): Promise<EntryRow[]> {
  const { data, error } = await supabase
    .from('entries')
    .select(ENTRY_COLUMNS)
    .eq('owner_id', userId)
    .overrideTypes<EntryRow[]>()
  if (error) throw databaseError('entries.list', error)
  return data
}

export async function countEntries(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
  if (error) throw databaseError('entries.count', error)
  return count ?? 0
}

export async function listWholeResponse(
  supabase: SupabaseClient,
  userId: string,
): Promise<EntryRow[]> {
  const result = await supabase
    .from('entries')
    .select(ENTRY_COLUMNS)
    .eq('owner_id', userId)
    .overrideTypes<EntryRow[]>()
  if (result.error) throw databaseError('entries.list', result.error)
  return result.data
}

export async function countWholeResponse(supabase: SupabaseClient): Promise<number> {
  const result = await supabase.from('entries').select('id', { count: 'exact', head: true })
  if (result.error) throw databaseError('entries.count', result.error)
  return result.count ?? 0
}
