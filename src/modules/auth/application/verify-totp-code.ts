import { err, ok, type Result } from '@/shared/domain/result'

import {
  InvalidTotpCodeError,
  SecondFactorMissingError,
  TooManyAttemptsError,
} from '../domain/errors'
import type { TotpCodeInput } from '../domain/totp'
import type { MfaGateway } from './mfa-gateway'

export type VerifyTotpCodeError =
  InvalidTotpCodeError | SecondFactorMissingError | TooManyAttemptsError

export function makeVerifyTotpCode({ mfa }: { mfa: MfaGateway }) {
  return async (input: TotpCodeInput): Promise<Result<void, VerifyTotpCodeError>> => {
    const factorId = input.factorId ?? (await mfa.verifiedTotpFactorId())
    if (!factorId) {
      return err(new SecondFactorMissingError('Второй фактор не подключён'))
    }
    const outcome = await mfa.verifyTotp({ factorId, code: input.code })
    if (outcome === 'invalid-code') {
      return err(new InvalidTotpCodeError('Код не подошёл: введите новый код из приложения'))
    }
    if (outcome === 'too-many-attempts') {
      return err(new TooManyAttemptsError('Слишком много попыток, подождите минуту'))
    }
    return ok(undefined)
  }
}
