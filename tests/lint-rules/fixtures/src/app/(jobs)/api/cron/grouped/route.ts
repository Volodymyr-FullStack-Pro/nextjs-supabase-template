import { isCronRequest } from '@/shared/lib/cron'

// expect: local/cron-secret
export function GET(request: Request) {
  return Response.json({ allowed: isCronRequest(request) })
}
