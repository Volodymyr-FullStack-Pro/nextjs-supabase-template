import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

import { MFA_PATHS, type MfaStep, pendingMfaStep } from '@/shared/domain/mfa'
import { env } from '@/shared/infrastructure/env'
import { readAssurance } from '@/shared/infrastructure/supabase/assurance'
import { sessionCookieOptions } from '@/shared/infrastructure/supabase/cookie-options'
import type { Database } from '@/shared/infrastructure/supabase/types'
import { API_DENIALS, type ApiDenial } from '@/shared/lib/api-denial'

const LOGIN_PATH = '/login'
const PUBLIC_PATHS = ['/', LOGIN_PATH]
const PUBLIC_PREFIXES = ['/api/cron/']
const HTTP_SERVICE_UNAVAILABLE = 503

type ProxyState = { response: NextResponse; cacheHeaders: Headers }
type Denial = { redirectTo: string; api: ApiDenial }

const SIGNED_OUT: Denial = { redirectTo: LOGIN_PATH, api: API_DENIALS.unauthorized }
const stepPending = (step: MfaStep): Denial => ({
  redirectTo: MFA_PATHS[step],
  api: API_DENIALS.mfaRequired,
})

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))

function createProxyClient(request: NextRequest, state: ProxyState) {
  return createServerClient<Database>(env.supabaseUrl(), env.supabasePublishableKey(), {
    cookieOptions: sessionCookieOptions(request.nextUrl.host),
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        state.response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet)
          state.response.cookies.set(name, value, options)
        for (const [key, value] of Object.entries(headers)) {
          state.response.headers.set(key, value)
          state.cacheHeaders.set(key, value)
        }
      },
    },
  })
}

function withRefreshedSession(response: NextResponse, state: ProxyState) {
  for (const cookie of state.response.cookies.getAll()) response.cookies.set(cookie)
  for (const [key, value] of state.cacheHeaders) response.headers.set(key, value)
  return response
}

function deny(request: NextRequest, state: ProxyState, { redirectTo, api }: Denial) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return withRefreshedSession(NextResponse.json(api.body, { status: api.status }), state)
  }
  const url = request.nextUrl.clone()
  url.pathname = redirectTo
  return withRefreshedSession(NextResponse.redirect(url), state)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = isPublicPath(pathname)
  if (!env.hasSupabase()) {
    return isPublic
      ? NextResponse.next({ request })
      : new NextResponse('Сервис не настроен', { status: HTTP_SERVICE_UNAVAILABLE })
  }

  const state: ProxyState = {
    response: NextResponse.next({ request }),
    cacheHeaders: new Headers(),
  }
  const supabase = createProxyClient(request, state)
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (isPublic) return state.response
  if (!claims) return deny(request, state, SIGNED_OUT)

  const assurance = await readAssurance(supabase, claims.aal)
  if (!assurance) return deny(request, state, SIGNED_OUT)
  const step = pendingMfaStep(assurance, env.authRequireMfa())
  if (!step || pathname === MFA_PATHS[step]) return state.response
  return deny(request, state, stepPending(step))
}

export const config = {
  matcher: ['/((?!_next/static/|_next/image/?$|[^/]+\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
