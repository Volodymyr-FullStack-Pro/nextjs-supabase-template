import 'server-only'

import { createRequire } from 'node:module' // expect: no-restricted-imports

// eslint-disable-next-line @typescript-eslint/no-require-imports -- expect: @eslint-community/eslint-comments/no-restricted-disable
const { createClient } = require('@supabase/supabase-js') // expect-strict: @typescript-eslint/no-require-imports

const Decimal = require('decimal.js') // expect: @typescript-eslint/no-require-imports
const viaCreateRequire = createRequire(import.meta.url)('@/shared/infrastructure/supabase/admin')

export const loaded: unknown[] = [createClient, Decimal, viaCreateRequire]
