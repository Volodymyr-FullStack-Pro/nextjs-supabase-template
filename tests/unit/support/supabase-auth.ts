type Cookie = { name: string; value: string; options: Record<string, unknown> }
type SetAllCookies = (cookies: Cookie[], headers: Record<string, string>) => void
export type CookieMethods = { getAll?: () => unknown; setAll?: SetAllCookies }
type AuthError = { message: string; status: number }

export type AuthState = {
  claims: { sub: string; aal: 'aal1' | 'aal2' } | null
  claimsError: AuthError | null
  factors: { status: 'verified' | 'unverified' }[]
  factorsError: AuthError | null
  refreshedCookie: Cookie | null
}

export const USER_ID = 'user-1'
export const NO_STORE = 'private, no-cache, no-store, must-revalidate, max-age=0'

const signedOut = (overrides: Partial<AuthState> = {}): AuthState => ({
  claims: null,
  claimsError: null,
  factors: [],
  factorsError: null,
  refreshedCookie: null,
  ...overrides,
})
const aal1 = (overrides: Partial<AuthState> = {}) =>
  signedOut({ claims: { sub: USER_ID, aal: 'aal1' }, ...overrides })

export const SIGNED_OUT = signedOut()
export const REJECTED_TOKEN = signedOut({ claimsError: { message: 'invalid JWT', status: 401 } })
export const REVOKED_SESSION = aal1({ factorsError: { message: 'session not found', status: 403 } })
export const AUTH_OUTAGE = aal1({ factorsError: { message: 'upstream timeout', status: 503 } })
export const AAL1_WITH_FACTOR = aal1({ factors: [{ status: 'verified' }] })
export const AAL1_WITHOUT_FACTOR = aal1()
export const AAL1_UNCONFIRMED_FACTOR = aal1({ factors: [{ status: 'unverified' }] })
export const AAL2 = signedOut({ claims: { sub: USER_ID, aal: 'aal2' } })

let current: AuthState | undefined
let seenCookies: unknown

export function setAuthState(state: AuthState | undefined): void {
  current = state
  seenCookies = undefined
}

export const cookiesSeenBySupabase = () => seenCookies

function authState(): AuthState {
  if (!current) throw new Error('Тест не задал состояние Supabase Auth: setAuthState(...)')
  return current
}

export function fakeSupabase({ getAll, setAll }: CookieMethods = {}) {
  return {
    auth: {
      getClaims: () => {
        const { claims, claimsError, refreshedCookie } = authState()
        seenCookies = getAll?.()
        if (refreshedCookie) setAll?.([refreshedCookie], { 'Cache-Control': NO_STORE })
        return Promise.resolve(
          claims ? { data: { claims }, error: null } : { data: null, error: claimsError },
        )
      },
      mfa: {
        listFactors: () => {
          const { factors, factorsError } = authState()
          return Promise.resolve(
            factorsError
              ? { data: null, error: factorsError }
              : { data: { all: factors }, error: null },
          )
        },
      },
    },
  }
}
