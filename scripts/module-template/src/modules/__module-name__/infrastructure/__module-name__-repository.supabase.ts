import 'server-only'

import {
  databaseError,
  violatesUniqueConstraint,
} from '@/shared/infrastructure/supabase/postgres-errors'
import { createClient } from '@/shared/infrastructure/supabase/server'

import type { __ModuleName__Repository } from '../application/__module-name__-repository'
import {
  __MODULE_NAME___LIST_LIMIT,
  type __EntityName__,
  __EntityName__Schema,
} from '../domain/__entity-name__'

const __ENTITY_NAME___COLUMNS = 'id, title, amount::text, currency, created_at'
const REQUEST_KEY_CONSTRAINT = '__module_name___owner_id_client_request_id_key'

type __EntityName__Row = {
  id: string
  title: string
  amount: string
  currency: string
  created_at: string
}

function to__EntityName__(row: __EntityName__Row): __EntityName__ {
  return __EntityName__Schema.parse({
    id: row.id,
    title: row.title,
    amount: row.amount,
    currency: row.currency,
    createdAt: row.created_at,
  })
}

async function findByRequest(ownerId: string, clientRequestId: string): Promise<__EntityName__> {
  const supabase = await createClient()
  const { data: row, error } = await supabase
    .from('__module_name__')
    .select(__ENTITY_NAME___COLUMNS)
    .eq('owner_id', ownerId)
    .eq('client_request_id', clientRequestId)
    .single()
  if (error) throw databaseError('__moduleName__.findByRequest', error)
  return to__EntityName__(row)
}

export const supabase__ModuleName__Repository: __ModuleName__Repository = {
  async listForUser(userId) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('__module_name__')
      .select(__ENTITY_NAME___COLUMNS)
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(__MODULE_NAME___LIST_LIMIT)
    if (error) throw databaseError('__moduleName__.list', error)
    return data.map(to__EntityName__)
  },

  async insert(data) {
    const supabase = await createClient()
    const { data: row, error } = await supabase
      .from('__module_name__')
      .insert({
        owner_id: data.ownerId,
        title: data.title,
        amount: data.amount,
        currency: data.currency,
        client_request_id: data.clientRequestId,
      })
      .select(__ENTITY_NAME___COLUMNS)
      .single()
    if (violatesUniqueConstraint(error, REQUEST_KEY_CONSTRAINT)) {
      const __entityName__ = await findByRequest(data.ownerId, data.clientRequestId)
      return { __entityName__, repeatedRequest: true }
    }
    if (error) throw databaseError('__moduleName__.insert', error)
    return { __entityName__: to__EntityName__(row), repeatedRequest: false }
  },
}
