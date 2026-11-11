import { isCronRequest } from '@/shared/lib/cron'

const handlers = {
  GET: () => Response.json({ recalculated: 0 }),
  POST: () => Response.json({ recalculated: 0 }),
}

function recalculate(request: Request) {
  return Response.json({ allowed: isCronRequest(request) })
}

export { recalculate as PUT } // expect: local/cron-secret
export const { GET, POST } = handlers // expect: local/cron-secret
export const [PATCH] = [recalculate] // expect: local/cron-secret
export const DELETE = recalculate // expect: local/cron-secret
export * from '../checked/route' // expect: local/cron-secret
export { GET as HEAD } from '../checked/route' // expect: local/cron-secret
