export const startedAt = (): number => Date.now() // expect: local/pure-core

// expect: no-restricted-syntax
export function titleOf(row: unknown): string {
  return (row as { title: string }).title // expect: @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-type-assertion
}

export const loose = (row: any): string => String(row) // expect: @typescript-eslint/no-explicit-any
