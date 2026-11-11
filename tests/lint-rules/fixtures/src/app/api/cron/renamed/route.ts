import { isCronRequest as hasSecret } from '@/shared/lib/cron' // expect: local/cron-secret
import { isCronRequest } from './same-name'

const HTTP_UNAUTHORIZED = 401

export function GET(request: Request) {
  if (!isCronRequest(request)) return new Response(null, { status: HTTP_UNAUTHORIZED })
  return Response.json({ recalculated: hasSecret(request) })
}
