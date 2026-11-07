import { sql } from 'drizzle-orm'
import { index, numeric, pgPolicy, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { authenticatedRole, authUid, authUsers } from 'drizzle-orm/supabase'

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    amount: numeric('amount', { precision: 18, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notes_owner_id_created_at_idx').on(table.ownerId, table.createdAt.desc()),
    pgPolicy('notes: owner selects', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${authUid} = ${table.ownerId}`,
    }),
    pgPolicy('notes: owner inserts', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.ownerId}`,
    }),
    pgPolicy('notes: owner updates', {
      for: 'update',
      to: authenticatedRole,
      using: sql`${authUid} = ${table.ownerId}`,
      withCheck: sql`${authUid} = ${table.ownerId}`,
    }),
    pgPolicy('notes: owner deletes', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`${authUid} = ${table.ownerId}`,
    }),
  ],
).enableRLS()

export type NoteRow = typeof notes.$inferSelect
