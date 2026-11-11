import 'server-only'

export function createAdminClient() {
  return { from: (table: string) => table }
}
