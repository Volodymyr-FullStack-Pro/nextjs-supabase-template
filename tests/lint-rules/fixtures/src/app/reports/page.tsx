import { verifySession } from '@/shared/lib/session' // expect: local/behind-sign-in

export default async function ReportsPage() {
  const session = await verifySession()
  return <p>{session.userId}</p>
}
