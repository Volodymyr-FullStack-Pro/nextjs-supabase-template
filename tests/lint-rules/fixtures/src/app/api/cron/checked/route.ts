import { isCronRequest } from '@/shared/lib/cron'

const HTTP_UNAUTHORIZED = 401

export const maxDuration = 60

export function GET(request: Request) {
  if (!isCronRequest(request)) return new Response(null, { status: HTTP_UNAUTHORIZED })
  return Response.json({ recalculated: 0 })
}
