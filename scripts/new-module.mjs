#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
const name = process.argv[2]
const entity = process.argv[3] ?? name
if (!name || !KEBAB.test(name) || !KEBAB.test(entity)) {
  console.error(
    'Использование: npm run new:module <модуль> <запись>  (строчные буквы, цифры, дефис; например, businesses business)',
  )
  process.exit(1)
}
const toPascal = (kebab) =>
  kebab.replaceAll(/(^|-)([a-z0-9])/g, (_, __, letter) => letter.toUpperCase())
const Pascal = toPascal(name)
const Entity = toPascal(entity)
if (entity === name) {
  console.warn(
    `Имя одной записи не задано — тип будет ${Entity}. Для «${name}» обычно нужно единственное число: npm run new:module ${name} <запись>`,
  )
}
const camel = Pascal[0].toLowerCase() + Pascal.slice(1)
const moduleRoot = join('src', 'modules', name)
const pageRoot = join('src', 'app', name)
const testsRoot = join('tests', 'unit', 'modules', name)

const routeSegmentExists = (directory) => {
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry)
    if (!statSync(full).isDirectory()) continue
    if (entry === name) return true
    if (entry.startsWith('(') && routeSegmentExists(full)) return true
  }
  return false
}
const taken = [moduleRoot, pageRoot, testsRoot].filter((path) => existsSync(path))
if (taken.length > 0 || routeSegmentExists('src/app')) {
  console.error(
    `Имя «${name}» уже занято: ${taken.join(', ') || `маршрут /${name} в src/app`}. Выберите другое.`,
  )
  process.exit(1)
}

const files = {
  [`${moduleRoot}/domain/${entity}.ts`]: `import { z } from 'zod'

export const ${Entity}Schema = z.object({ id: z.string(), name: z.string().min(1) })
export type ${Entity} = z.infer<typeof ${Entity}Schema>
`,
  [`${moduleRoot}/application/${name}-repository.ts`]: `import type { ${Entity} } from '../domain/${entity}'

export interface ${Pascal}Repository {
  listForUser(userId: string): Promise<${Entity}[]>
}
`,
  [`${moduleRoot}/application/list-${name}.ts`]: `import type { ${Entity} } from '../domain/${entity}'
import type { ${Pascal}Repository } from './${name}-repository'

export function makeList${Pascal}({ repository }: { repository: ${Pascal}Repository }) {
  return (ctx: { userId: string }): Promise<${Entity}[]> => repository.listForUser(ctx.userId)
}
`,
  [`${moduleRoot}/infrastructure/${name}-repository.supabase.ts`]: `import 'server-only'

import type { ${Pascal}Repository } from '../application/${name}-repository'

export const supabase${Pascal}Repository: ${Pascal}Repository = {
  listForUser: () =>
    Promise.reject(new Error('${Pascal}Repository.listForUser: реализуйте запрос к таблице ${name}')),
}
`,
  [`${moduleRoot}/infrastructure/${name}-repository.fake.ts`]: `import type { ${Pascal}Repository } from '../application/${name}-repository'
import type { ${Entity} } from '../domain/${entity}'

type Stored = ${Entity} & { ownerId: string }

export function fake${Pascal}Repository(seed: Stored[] = []) {
  const rows: Stored[] = [...seed]
  const repository: ${Pascal}Repository = {
    listForUser: (userId) =>
      Promise.resolve(rows.filter((row) => row.ownerId === userId).map(({ id, name }) => ({ id, name }))),
  }
  return { repository, rows }
}
`,
  [`${moduleRoot}/server.ts`]: `import 'server-only'

import { makeList${Pascal} } from './application/list-${name}'
import { supabase${Pascal}Repository } from './infrastructure/${name}-repository.supabase'

export const ${camel} = {
  list: makeList${Pascal}({ repository: supabase${Pascal}Repository }),
}
`,
  [`${moduleRoot}/ui/${name}-list.tsx`]: `import { requireVerifiedSession } from '@/shared/lib/session'

import { ${camel} } from '../server'

export async function ${Pascal}List() {
  const session = await requireVerifiedSession()
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
  [`${pageRoot}/page.tsx`]: `import { Suspense } from 'react'

import { ${Pascal}List } from '@/modules/${name}/ui/${name}-list'

export default function ${Pascal}Page() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Название раздела</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Загружаю…</p>}>
        <${Pascal}List />
      </Suspense>
    </main>
  )
}
`,
  [`${testsRoot}/${entity}.test.ts`]: `import { describe, expect, it } from 'vitest'

import { ${Entity}Schema } from '@/modules/${name}/domain/${entity}'

describe('${Entity}Schema', () => {
  it('accepts an object with an id and a name', () => {
    expect(${Entity}Schema.safeParse({ id: '1', name: 'Первый' }).success).toBe(true)
  })

  it('rejects an empty name', () => {
    expect(${Entity}Schema.safeParse({ id: '1', name: '' }).success).toBe(false)
  })
})
`,
  [`${testsRoot}/list-${name}.test.ts`]: `import { describe, expect, it } from 'vitest'

import { makeList${Pascal} } from '@/modules/${name}/application/list-${name}'
import { fake${Pascal}Repository } from '@/modules/${name}/infrastructure/${name}-repository.fake'

describe('list${Pascal}', () => {
  it('lists only the items of the current user', async () => {
    const { repository } = fake${Pascal}Repository([
      { id: '1', name: 'Мой', ownerId: 'u1' },
      { id: '2', name: 'Чужой', ownerId: 'u2' },
    ])
    const items = await makeList${Pascal}({ repository })({ userId: 'u1' })
    expect(items.map((item) => item.name)).toEqual(['Мой'])
  })
})
`,
}

const written = Object.keys(files)
for (const [path, content] of Object.entries(files)) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
  console.log(`  + ${path}`)
}
execFileSync('npx', ['prettier', '--write', '--log-level', 'warn', ...written], {
  stdio: 'inherit',
})
console.log(
  `\nМодуль ${name} создан. Дальше: заголовок «Название раздела» в ${pageRoot}/page.tsx — на название раздела; npm run lint && npm run typecheck && npm test, затем domain → use cases → репозиторий.`,
)
console.log(
  'Таблица — миграцией по образцу из .claude/rules/db.md (в шаблоне — notes; образцы SQL — examples.md скила dev-kit:supabase-rls): политики владельца, ограничивающая политика второго фактора, триггер журнала, check (amount <> NaN); деньги — numeric рядом с currency, выбор текстом (amount::text), ввод через parseDecimalInput (скил dev-kit:money-decimal). Тексты ошибок — ui/messages.ts по кодам.',
)
