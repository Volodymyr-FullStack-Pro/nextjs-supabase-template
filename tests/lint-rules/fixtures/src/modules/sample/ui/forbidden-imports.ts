import Decimal from 'decimal.js' // expect: no-restricted-imports

import { createAdminClient } from '@/shared/infrastructure/supabase/admin' // expect: no-restricted-imports

import { createAdminClient as adminByRelativePath } from '../../../../../../../src/shared/infrastructure/supabase/admin' // expect: no-restricted-imports

export { createAdminClient as adminClient } from '@/shared/infrastructure/supabase/admin' // expect: no-restricted-imports

export const clients = [adminByRelativePath, createAdminClient, new Decimal(0)]
export const secretKey = process.env['SUPABASE_SECRET_KEY'] // expect: no-restricted-properties
export const databaseUrl = process.env.DATABASE_URL // expect: no-restricted-properties
