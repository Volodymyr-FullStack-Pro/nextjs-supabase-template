import { z } from 'zod'

const TOTP_CODE = /^\d{6}$/u
const WHITESPACE = /\s/gu

export const TotpCodeInput = z.object({
  code: z
    .string()
    .transform((raw) => raw.replace(WHITESPACE, ''))
    .pipe(z.string().regex(TOTP_CODE, 'Введите 6 цифр из приложения')),
  factorId: z.uuid().optional(),
})
export type TotpCodeInput = z.infer<typeof TotpCodeInput>

export type TotpEnrollment = { factorId: string; qrCode: string; secret: string }
