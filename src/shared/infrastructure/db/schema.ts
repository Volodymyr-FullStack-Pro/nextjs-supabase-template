import { sql } from 'drizzle-orm'
import {
  check,
  index,
  numeric,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { authenticatedRole, authUid, authUsers } from 'drizzle-orm/supabase'

const NOTE_TITLE_MAX = 200
const MONEY_PRECISION = 18
const MONEY_SCALE = 2

export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    amount: numeric('amount', { precision: MONEY_PRECISION, scale: MONEY_SCALE })
      .notNull()
      .default('0'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notes_owner_id_created_at_idx').on(table.ownerId, table.createdAt.desc().nullsFirst()),
    check(
      'notes_title_length',
      sql`char_length(${table.title}) <= ${sql.raw(String(NOTE_TITLE_MAX))}`,
    ),
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
