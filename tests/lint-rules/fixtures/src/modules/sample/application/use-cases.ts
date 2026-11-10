import { NotFoundError, RuleViolationError } from '@/shared/domain/errors'
import { err, ok, type Result } from '@/shared/domain/result'

type Entries = { close(id: string, userId: string): Promise<boolean> }

export function makeCloseEntry({ entries }: { entries: Entries }) {
  return async (id: string, ctx: { userId: string }): Promise<Result<string, NotFoundError>> => {
    const closed = await entries.close(id, ctx.userId)
    return closed ? ok(id) : err(new NotFoundError())
  }
}

export function makeCloseStrictly({ entries }: { entries: Entries }) {
  return async (id: string, ctx: { userId: string }): Promise<void> => {
    const closed = await entries.close(id, ctx.userId)
    if (!closed) throw new RuleViolationError('entry.closed') // expect: local/no-throw-in-use-case
  }
}
