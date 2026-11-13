import { Suspense } from 'react'

import { __ModuleName__Form } from '@/modules/__module-name__/ui/__module-name__-form'
import {
  __ModuleName__List,
  __ModuleName__ListSkeleton,
} from '@/modules/__module-name__/ui/__module-name__-list'

export default function __ModuleName__Page() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Название раздела</h1>
      <__ModuleName__Form />
      <Suspense fallback={<__ModuleName__ListSkeleton />}>
        <__ModuleName__List />
      </Suspense>
    </main>
  )
}
