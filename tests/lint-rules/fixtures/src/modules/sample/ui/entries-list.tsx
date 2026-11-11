import * as safeAction from '@/shared/lib/safe-action' // expect: local/behind-sign-in
import { verifySession } from '@/shared/lib/session' // expect: local/behind-sign-in

type Entry = { id: string; amount: string; balance: string; fee: string }

declare function listEntries(userId: string): Promise<Entry[]>

export const clients = Object.keys(safeAction)

export async function currentUser() {
  const { verifySession: readSession } = await import('@/shared/lib/session') // expect: local/behind-sign-in
  const { actionClient } = await import('@/shared/lib/safe-action') // expect: local/behind-sign-in
  return { session: await readSession(), actionClient }
}

export async function EntriesList() {
  const session = await verifySession()
  const entries = await listEntries(session.userId)
  return (
    <ul>
      {entries.map((entry) => (
        <li key={entry.id}>
          {Number(entry.amount).toFixed(0) /* expect: local/money-as-number */}
          {Number.parseFloat(entry.balance) /* expect: local/money-as-number */}
          {+entry.fee /* expect: local/money-as-number */}
        </li>
      ))}
    </ul>
  )
}
