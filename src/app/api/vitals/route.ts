import { WebVitalSchema } from '@/shared/lib/web-vitals'

export async function POST(request: Request) {
  const parsed = WebVitalSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response(null, { status: 400 })
  console.info(JSON.stringify({ type: 'web-vital', ...parsed.data }))
  return new Response(null, { status: 204 })
}
