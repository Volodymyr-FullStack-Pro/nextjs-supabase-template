import { sql } from 'drizzle-orm'
import { index, numeric, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { authUid, authUsers, authenticatedRole } from 'drizzle-orm/supabase'

// Схема — источник типов для кода и документация политик. SQL-миграции для Supabase лежат в supabase/migrations
// (там же RLS); `npm run db:generate` строит SQL из этой схемы в drizzle/ для сверки.
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    // Деньги: numeric как строка; mode: 'number' запрещён (см. скил money-decimal).
    amount: numeric('amount', { precision: 18, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('notes_owner_id_idx').on(t.ownerId), // колонка политики — с индексом
    pgPolicy('notes: owner selects', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${authUid} = ${t.ownerId}`,
    }),
    pgPolicy('notes: owner inserts', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${t.ownerId}`,
    }),
    pgPolicy('notes: owner updates', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${authUid} = ${t.ownerId}`,
      withCheck: sql`${authUid} = ${t.ownerId}`,
    }),
    pgPolicy('notes: owner deletes', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`${authUid} = ${t.ownerId}`,
    }),
  ],
).enableRLS()

export type NoteRow = typeof notes.$inferSelect
