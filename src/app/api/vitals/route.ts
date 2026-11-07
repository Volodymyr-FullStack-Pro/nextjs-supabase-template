import { WebVitalSchema } from '@/shared/lib/web-vitals'

const MAX_BODY_BYTES = 1024

export async function POST(request: Request) {
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > MAX_BODY_BYTES) return new Response(null, { status: 413 })
  const parsed = WebVitalSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response(null, { status: 400 })
  console.info(JSON.stringify({ type: 'web-vital', ...parsed.data }))
  return new Response(null, { status: 204 })
}
