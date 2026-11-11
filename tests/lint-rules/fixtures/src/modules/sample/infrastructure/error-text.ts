import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

export async function insertEntry(supabase: SupabaseClient, amount: string): Promise<void> {
  const { error } = await supabase.from('entries').insert({ amount })
  if (error) throw new Error(`entries.insert: ${error.message}`) // expect: local/error-by-code
}

export async function removeEntry(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('entries').delete().eq('id', id)
  if (error) throw new RangeError(['entries.remove', error.details, error.hint].join(': ')) // expect: local/error-by-code
}

export async function closeEntry(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('entries').update({ closed: true }).eq('id', id)
  if (error) throw new Error(`entries.close: ${error.code}`, { cause: error }) // expect: local/error-by-code
}

export async function reopenEntry(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from('entries').update({ closed: false }).eq('id', id)
  if (error) throw error // expect: local/error-by-code
}

export async function signOut(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error // expect: local/error-by-code
}
