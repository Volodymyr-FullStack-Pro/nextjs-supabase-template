import 'server-only'

import { createAdminClient } from '@/shared/infrastructure/supabase/./admin' // expect: local/import-path
import { createAdminClient as sameFile } from '@/shared/infrastructure/supabase/../supabase/admin' // expect: local/import-path

export const clients = [createAdminClient, sameFile]
