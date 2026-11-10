import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

const ENTRY_COLUMNS = 'id, amount::text'

type EntryRow = { id: string; amount: string }

export async function listEntries(supabase: SupabaseClient, userId: string): Promise<EntryRow[]> {
  const { data, error } = await supabase
    .from('entries')
    .select(ENTRY_COLUMNS)
    .eq('owner_id', userId)
    .overrideTypes<EntryRow[]>()
  if (error) throw new Error(`entries.list: ${error.message}`)
  return data
}

export async function countEntries(supabase: SupabaseClient, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
  if (error) throw new Error(`entries.count: ${error.message}`)
  return count ?? 0
}
