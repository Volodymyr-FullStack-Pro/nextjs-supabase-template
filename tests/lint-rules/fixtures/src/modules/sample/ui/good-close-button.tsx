'use client'

import type { InferSafeActionFnResult } from 'next-safe-action'
import { useAction } from 'next-safe-action/hooks'

import { closeEntry } from './good-actions'

type Closed = InferSafeActionFnResult<typeof closeEntry>['data']

export function CloseButton({ id, onClosed }: { id: string; onClosed: (closed: Closed) => void }) {
  const action = useAction(closeEntry, { onSuccess: ({ data }) => onClosed(data) })
  return (
    <button type="button" disabled={action.isPending} onClick={() => action.execute({ id })}>
      Закрыть
    </button>
  )
}
