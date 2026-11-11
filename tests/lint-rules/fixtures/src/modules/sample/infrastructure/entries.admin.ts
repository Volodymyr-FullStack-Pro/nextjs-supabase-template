import 'server-only'

import Decimal from 'decimal.js' // expect: no-restricted-imports

import { createAdminClient } from '@/shared/infrastructure/supabase/admin'

export function systemClient() {
  return { client: createAdminClient(), zero: new Decimal(0) }
}
