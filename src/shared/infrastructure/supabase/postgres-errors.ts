import 'server-only'

const UNIQUE_VIOLATION = '23505'
const WITHOUT_CODE = 'unknown'

type DatabaseError = { code: string; message: string }

export function violatesUniqueConstraint(error: DatabaseError | null, constraint: string): boolean {
  return error?.code === UNIQUE_VIOLATION && error.message.includes(`"${constraint}"`)
}

export function databaseError(operation: string, error: { code?: string | undefined }): Error {
  return new Error(`${operation}: ${error.code || WITHOUT_CODE}`)
}
