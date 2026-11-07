import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: ['.env.local', '.env'] }) // как Next.js: сначала .env.local

export default defineConfig({
  schema: './src/shared/infrastructure/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
  entities: { roles: { provider: 'supabase' } },
})
