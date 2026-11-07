import { WebVitalSchema } from '@/shared/lib/web-vitals'

const MAX_BODY_BYTES = 1024

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const body = await request.text()
  if (body.length > MAX_BODY_BYTES) return new Response(null, { status: 413 })
  const parsed = WebVitalSchema.safeParse(parseJson(body))
  if (!parsed.success) return new Response(null, { status: 400 })
  console.info(JSON.stringify({ type: 'web-vital', ...parsed.data }))
  return new Response(null, { status: 204 })
}
