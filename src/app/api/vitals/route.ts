import { WebVitalSchema } from '@/shared/lib/web-vitals'

const MAX_BODY_BYTES = 1024
const HTTP_NO_CONTENT = 204
const HTTP_BAD_REQUEST = 400
const HTTP_PAYLOAD_TOO_LARGE = 413

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return new Response(null, { status: HTTP_PAYLOAD_TOO_LARGE })
  const body = await request.text()
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES)
    return new Response(null, { status: HTTP_PAYLOAD_TOO_LARGE })
  const parsed = WebVitalSchema.safeParse(parseJson(body))
  if (!parsed.success) return new Response(null, { status: HTTP_BAD_REQUEST })
  console.info(JSON.stringify({ type: 'web-vital', ...parsed.data }))
  return new Response(null, { status: HTTP_NO_CONTENT })
}
