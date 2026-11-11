import type { __EntityName__ } from '../domain/__entity-name__'
import type { __ModuleName__Repository } from './__module-name__-repository'

export function makeList__ModuleName__({
  __moduleName__,
}: {
  __moduleName__: __ModuleName__Repository
}) {
  return (ctx: { userId: string }): Promise<__EntityName__[]> =>
    __moduleName__.listForUser(ctx.userId)
}
