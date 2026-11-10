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

// expect: local/cron-secret
export async function PATCH(request: Request) {
  await Promise.resolve()
  if (!isCronRequest(request)) return new Response(null, { status: HTTP_UNAUTHORIZED })
  return Response.json({ recalculated: 0 })
}

// expect: local/cron-secret
export function DELETE(request: Request) {
  if (!isCronRequest(request)) console.warn('no secret')
  return Response.json({ recalculated: 0 })
}

// expect: local/cron-secret
export const HEAD = (request: Request) => {
  if (isCronRequest(request)) return Response.json({ recalculated: 0 })
  return new Response(null, { status: HTTP_UNAUTHORIZED })
}
