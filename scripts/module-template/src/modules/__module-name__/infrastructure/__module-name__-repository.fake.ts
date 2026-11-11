import type {
  __ModuleName__Repository,
  New__EntityName__,
} from '../application/__module-name__-repository'
import type { __EntityName__ } from '../domain/__entity-name__'

type Stored__EntityName__ = New__EntityName__ & { id: string; createdAt: string }

const to__EntityName__ = ({
  id,
  title,
  amount,
  currency,
  createdAt,
}: Stored__EntityName__): __EntityName__ => ({
  id,
  title,
  amount,
  currency,
  createdAt,
})

export function fake__ModuleName__Repository(seed: Stored__EntityName__[] = []) {
  const rows: Stored__EntityName__[] = [...seed]
  const repository: __ModuleName__Repository = {
    listForUser: (userId) =>
      Promise.resolve(
        rows
          .filter((row) => row.ownerId === userId)
          .toSorted((left, right) => right.createdAt.localeCompare(left.createdAt))
          .map(to__EntityName__),
      ),
    insert: (data) => {
      const existing = rows.find(
        (row) => row.ownerId === data.ownerId && row.clientRequestId === data.clientRequestId,
      )
      if (existing) {
        return Promise.resolve({
          __entityName__: to__EntityName__(existing),
          repeatedRequest: true,
        })
      }
      const stored: Stored__EntityName__ = {
        ...data,
        id: `__entity-name__-${String(rows.length + 1)}`,
        createdAt: new Date(rows.length).toISOString(),
      }
      rows.push(stored)
      return Promise.resolve({ __entityName__: to__EntityName__(stored), repeatedRequest: false })
    },
  }
  return { repository, rows }
}
