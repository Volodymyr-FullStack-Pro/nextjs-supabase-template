import type { TotpEnrollment } from '../domain/totp'
import type { MfaGateway } from './mfa-gateway'

export function makeStartTotpSetup({ mfa }: { mfa: Pick<MfaGateway, 'enrollTotp'> }) {
  return (): Promise<TotpEnrollment> => mfa.enrollTotp()
}
