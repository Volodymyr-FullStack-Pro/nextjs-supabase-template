import 'server-only'

const UNIQUE_VIOLATION = '23505'

type DatabaseError = { code: string; message: string }

export function violatesUniqueConstraint(error: DatabaseError | null, constraint: string): boolean {
  return error?.code === UNIQUE_VIOLATION && error.message.includes(`"${constraint}"`)
}
