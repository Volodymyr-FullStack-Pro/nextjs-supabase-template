import { formatMoney } from '@/shared/domain/money'
import { formatDate } from '@/shared/domain/time'
import { requireVerifiedSession } from '@/shared/lib/session'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

import { __moduleName__ } from '../server'

const SKELETON_CARDS = ['first', 'second', 'third']

export function __ModuleName__ListSkeleton() {
  return (
    <div role="status" aria-label="Загружаю список" className="flex flex-col gap-2">
      {SKELETON_CARDS.map((card) => (
        <div key={card} className="h-28 rounded-xl bg-muted motion-safe:animate-pulse" />
      ))}
    </div>
  )
}

export async function __ModuleName__List() {
  const session = await requireVerifiedSession()
  const items = await __moduleName__.list({ userId: session.userId })
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Пока пусто — добавьте первую запись в форме выше
      </p>
    )
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((__entityName__) => (
        <li key={__entityName__.id}>
          <Card>
            <CardHeader>
              <CardTitle className="wrap-anywhere">{__entityName__.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="whitespace-nowrap">{formatDate(__entityName__.createdAt)}</span>
              <span className="ml-auto text-right wrap-anywhere text-foreground tabular-nums">
                {formatMoney(__entityName__.amount, { currency: __entityName__.currency })}
              </span>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}
