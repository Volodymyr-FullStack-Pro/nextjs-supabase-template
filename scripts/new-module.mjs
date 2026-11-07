#!/usr/bin/env node
// Каркас нового модуля по архитектуре шаблона: domain / application / infrastructure / ui + server.ts,
// фейк репозитория, тест use case и тонкая страница. Запуск: npm run new:module <имя-в-kebab-case>
// После генерации: описать модель в domain, реализовать репозиторий в infrastructure, добавить use cases.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const name = process.argv[2]
if (!name || !/^[a-z][a-z0-9-]*$/.test(name)) {
  console.error(
    'Использование: npm run new:module <имя>  (строчные буквы, цифры, дефис; например, businesses)',
  )
  process.exit(1)
}
const Pascal = name.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase())
const camel = Pascal[0].toLowerCase() + Pascal.slice(1)
const root = join('src', 'modules', name)
if (existsSync(root)) {
  console.error(`Модуль ${name} уже есть: ${root}`)
  process.exit(1)
}

const files = {
  [`${root}/domain/${name}.ts`]: `import { z } from 'zod'

/** Модель домена «${name}»: что система знает об объекте. Не строка таблицы. */
export const ${Pascal}Schema = z.object({ id: z.string(), name: z.string() })
export type ${Pascal} = z.infer<typeof ${Pascal}Schema>
`,
  [`${root}/application/${name}-repository.ts`]: `import type { ${Pascal} } from '../domain/${name}'

/** Порт хранилища: реализуется в infrastructure (Supabase) и в фейке для тестов. */
export interface ${Pascal}Repository {
  listForUser(userId: string): Promise<${Pascal}[]>
}
`,
  [`${root}/application/list-${name}.ts`]: `import type { ${Pascal} } from '../domain/${name}'
import type { ${Pascal}Repository } from './${name}-repository'

/** Use case: без ожидаемых ошибок возвращает значение; с ошибками домена — Result из shared/domain/result. */
export function makeList${Pascal}({ repo }: { repo: ${Pascal}Repository }) {
  return (ctx: { userId: string }): Promise<${Pascal}[]> => repo.listForUser(ctx.userId)
}
`,
  [`${root}/infrastructure/${name}-repository.supabase.ts`]: `import 'server-only'
import type { ${Pascal}Repository } from '../application/${name}-repository'

/** Реализация на user-scoped клиенте Supabase (RLS). Заполните запрос к таблице «${name}» и перевод строк в модель. */
export const supabase${Pascal}Repository: ${Pascal}Repository = {
  listForUser: () =>
    Promise.reject(new Error('${Pascal}Repository.listForUser: реализуйте запрос к таблице ${name}')),
}
`,
  [`${root}/infrastructure/${name}-repository.fake.ts`]: `import type { ${Pascal}Repository } from '../application/${name}-repository'
import type { ${Pascal} } from '../domain/${name}'

type Stored = ${Pascal} & { ownerId: string }

/** In-memory реализация порта для тестов use cases. */
export function fake${Pascal}Repository(seed: Stored[] = []) {
  const rows: Stored[] = [...seed]
  const repo: ${Pascal}Repository = {
    listForUser: (userId) =>
      Promise.resolve(rows.filter((row) => row.ownerId === userId).map(({ id, name }) => ({ id, name }))),
  }
  return { repo, rows }
}
`,
  [`${root}/server.ts`]: `import 'server-only'
import { makeList${Pascal} } from './application/list-${name}'
import { supabase${Pascal}Repository } from './infrastructure/${name}-repository.supabase'

/** Точка сборки модуля: use cases с реальными репозиториями. */
export const ${camel} = {
  list: makeList${Pascal}({ repo: supabase${Pascal}Repository }),
}
`,
  [`${root}/ui/${name}-list.tsx`]: `import { verifySession } from '@/shared/lib/session'
import { ${camel} } from '../server'

/** Динамическая часть страницы (сессия + база): страница оборачивает её в Suspense. */
export async function ${Pascal}List() {
  const session = await verifySession()
  const items = await ${camel}.list({ userId: session.userId })
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Пока пусто</p>
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  )
}
`,
  [`src/app/${name}/page.tsx`]: `import { Suspense } from 'react'
import { ${Pascal}List } from '@/modules/${name}/ui/${name}-list'

export default function ${Pascal}Page() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">${Pascal}</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Загружаю…</p>}>
        <${Pascal}List />
      </Suspense>
    </main>
  )
}
`,
  [`tests/unit/modules/${name}/list-${name}.test.ts`]: `import { describe, expect, it } from 'vitest'
import { makeList${Pascal} } from '@/modules/${name}/application/list-${name}'
import { fake${Pascal}Repository } from '@/modules/${name}/infrastructure/${name}-repository.fake'

describe('list${Pascal}', () => {
  it('lists only the items of the current user', async () => {
    const { repo } = fake${Pascal}Repository([
      { id: '1', name: 'Мой', ownerId: 'u1' },
      { id: '2', name: 'Чужой', ownerId: 'u2' },
    ])
    const items = await makeList${Pascal}({ repo })({ userId: 'u1' })
    expect(items.map((item) => item.name)).toEqual(['Мой'])
  })
})
`,
}

for (const [path, content] of Object.entries(files)) {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, content)
  console.log(`  + ${path}`)
}
console.log(
  `\nМодуль ${name} создан. Дальше: npm run lint && npm run typecheck && npm test, затем domain → use cases → репозиторий.`,
)
