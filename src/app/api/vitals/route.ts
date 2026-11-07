import { WebVitalSchema } from '@/shared/lib/web-vitals'

/** Приём Web Vitals из браузера. Сейчас — структурированный лог (виден в Vercel/Sentry logs); в проекте — отправка в Sentry или аналитику. */
export async function POST(request: Request) {
  const parsed = WebVitalSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response(null, { status: 400 })
  console.info(JSON.stringify({ type: 'web-vital', ...parsed.data }))
  return new Response(null, { status: 204 })
}
