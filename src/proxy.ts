import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'
import type { Database } from '@/lib/supabase/types'

const PUBLIC_PATHS = ['/', '/login']

/**
 * Обновляет сессию Supabase в cookie и уводит неавторизованных со служебных страниц на /login.
 * Это не единственная защита: права проверяются в DAL (src/data) и в каждом Server Action.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  if (!env.hasSupabase()) return response // шаблон без настроенного Supabase: публичные страницы работают

  const supabase = createServerClient<Database>(env.supabaseUrl(), env.supabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet)
          response.cookies.set(name, value, options)
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.includes(pathname)
  if (!data?.claims && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirect = NextResponse.redirect(url)
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie) // обновлённая сессия не теряется
    return redirect
  }
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
