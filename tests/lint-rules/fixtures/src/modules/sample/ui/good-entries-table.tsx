import { formatMoney, money } from '@/shared/domain/money'
import { requireVerifiedSession } from '@/shared/lib/session'

type Entry = { id: string; amount: string; currency: string }

declare function listEntries(userId: string): Promise<Entry[]>

const chartHeight = (entry: Entry) => money(entry.amount).toNumber()

export async function EntriesTable() {
  const session = await requireVerifiedSession()
  const entries = await listEntries(session.userId)
  return (
    <div role="region" aria-label="Записи" tabIndex={0} className="overflow-x-auto">
      <table>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="tabular-nums">
                {formatMoney(entry.amount, { currency: entry.currency })}
              </td>
              <td>
                <meter value={chartHeight(entry)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
