import type { __EntityName__ } from '../domain/__entity-name__'

export type New__EntityName__ = {
  ownerId: string
  title: string
  amount: string
  currency: string
  clientRequestId: string
}

export type Inserted__EntityName__ = { __entityName__: __EntityName__; repeatedRequest: boolean }

export interface __ModuleName__Repository {
  listForUser(userId: string): Promise<__EntityName__[]>
  insert(data: New__EntityName__): Promise<Inserted__EntityName__>
}
