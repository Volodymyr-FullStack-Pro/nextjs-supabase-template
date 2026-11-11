import 'server-only'

import { makeCreate__EntityName__ } from './application/create-__entity-name__'
import { makeList__ModuleName__ } from './application/list-__module-name__'
import { supabase__ModuleName__Repository } from './infrastructure/__module-name__-repository.supabase'

export const __moduleName__ = {
  create: makeCreate__EntityName__({ __moduleName__: supabase__ModuleName__Repository }),
  list: makeList__ModuleName__({ __moduleName__: supabase__ModuleName__Repository }),
}
