import { describe, expect, it } from 'vitest'

import { makeList__ModuleName__ } from '@/modules/__module-name__/application/list-__module-name__'
import { fake__ModuleName__Repository } from '@/modules/__module-name__/infrastructure/__module-name__-repository.fake'

const stored = (id: string, ownerId: string, createdAt: string) => ({
  id,
  title: `Запись ${id}`,
  amount: '0.00',
  currency: 'EUR',
  clientRequestId: `00000000-0000-4000-8000-00000000000${id}`,
  createdAt,
  ownerId,
})
const seed = [
  stored('1', 'u1', '2026-01-01T00:00:00.000Z'),
  stored('2', 'u1', '2026-01-02T00:00:00.000Z'),
  stored('3', 'u2', '2026-01-03T00:00:00.000Z'),
]

describe('list__ModuleName__', () => {
  it('lists only the records of the current user, newest first', async () => {
    const list__ModuleName__ = makeList__ModuleName__({
      __moduleName__: fake__ModuleName__Repository(seed).repository,
    })

    const items = await list__ModuleName__({ userId: 'u1' })

    expect(items.map((item) => item.id)).toEqual(['2', '1'])
  })

  it('returns the model without the owner and the request id', async () => {
    const list__ModuleName__ = makeList__ModuleName__({
      __moduleName__: fake__ModuleName__Repository(seed).repository,
    })

    const items = await list__ModuleName__({ userId: 'u2' })

    expect(items).toEqual([
      {
        id: '3',
        title: 'Запись 3',
        amount: '0.00',
        currency: 'EUR',
        createdAt: '2026-01-03T00:00:00.000Z',
      },
    ])
  })
})
