const HTTP_UNAUTHORIZED = 401 // expect: local/cron-secret
const isCronRequest = (request: Request) => request.method === 'GET'

export function GET(request: Request) {
  if (!isCronRequest(request)) return new Response(null, { status: HTTP_UNAUTHORIZED })
  return Response.json({ recalculated: 0 })
}
