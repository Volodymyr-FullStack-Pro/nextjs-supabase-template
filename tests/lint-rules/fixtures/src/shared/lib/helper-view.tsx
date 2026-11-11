import 'server-only'

import { env } from '@/shared/infrastructure/env' // expect: no-restricted-imports

export const SiteLink = () => <a href={env.supabaseUrl()}>Supabase</a>
