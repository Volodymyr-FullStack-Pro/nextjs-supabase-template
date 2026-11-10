import 'server-only'

export async function adminClient() {
  const { createAdminClient } = await import('@/shared/infrastructure/supabase/admin') // expect: local/dynamic-import
  return createAdminClient()
}

export async function directConnection() {
  return import('../../../shared/infrastructure/db') // expect: local/dynamic-import
}

export async function rawClient(url: string, key: string) {
  const { createClient } = await import('@supabase/supabase-js') // expect: local/raw-client
  return createClient(url, key)
}

export async function byName(name: string) {
  return import(`@/shared/infrastructure/supabase/${name}`) // expect: local/dynamic-import
}
