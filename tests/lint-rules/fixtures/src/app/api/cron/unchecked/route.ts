import { isCronRequest } from '@/shared/lib/cron'

const HTTP_UNAUTHORIZED = 401

// expect: local/cron-secret
export function GET() {
  return Response.json({ recalculated: 0 })
}

// expect: local/cron-secret
export function POST(request: Request) {
  const allowed = isCronRequest(request)
  return Response.json({ allowed })
}

// expect: local/cron-secret
export const PUT = (request: Request) =>
  Response.json({ url: request.url }, { status: HTTP_UNAUTHORIZED })
