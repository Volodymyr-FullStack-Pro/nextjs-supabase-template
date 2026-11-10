import 'server-only'

type AuthFailure = { code?: string | undefined; status?: number | undefined }

export function authError(operation: string, { code, status }: AuthFailure): Error {
  const reason = [code, status === undefined ? undefined : `(${String(status)})`]
  return new Error(`${operation}: ${reason.filter(Boolean).join(' ') || 'unknown'}`)
}
