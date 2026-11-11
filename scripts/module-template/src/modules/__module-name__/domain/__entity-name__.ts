import { z } from 'zod'

import { isIsoCurrency } from '@/shared/domain/currency'
import { decimalPattern, parseDecimalInput, SCALE } from '@/shared/domain/decimal-input'
import { normalizeText } from '@/shared/domain/text'

export const __ENTITY_NAME___TITLE_MAX = 200
export const __MODULE_NAME___LIST_LIMIT = 100
export const __ENTITY_NAME___CURRENCY_LENGTH = 3

export const __ENTITY_NAME___MESSAGE_KEYS = {
  titleRequired: '__entityName__.title.required',
  titleTooLong: '__entityName__.title.tooLong',
  titleMeaningless: '__entityName__.title.meaningless',
  amountInvalid: '__entityName__.amount.invalid',
  amountTooPrecise: '__entityName__.amount.tooPrecise',
  currencyInvalid: '__entityName__.currency.invalid',
  requestReused: '__entityName__.request.reused',
} as const
export type __EntityName__MessageKey =
  (typeof __ENTITY_NAME___MESSAGE_KEYS)[keyof typeof __ENTITY_NAME___MESSAGE_KEYS]

export const __EntityName__Schema = z.object({
  id: z.string(),
  title: z.string(),
  amount: z.string().regex(decimalPattern(SCALE.fiat)),
  currency: z.string(),
  createdAt: z.string(),
})
export type __EntityName__ = z.infer<typeof __EntityName__Schema>

export const Create__EntityName__Input = z.object({
  title: z
    .string()
    .transform(normalizeText)
    .pipe(
      z
        .string()
        .min(1, __ENTITY_NAME___MESSAGE_KEYS.titleRequired)
        .max(__ENTITY_NAME___TITLE_MAX, __ENTITY_NAME___MESSAGE_KEYS.titleTooLong),
    ),
  amount: z.string().transform((raw, ctx) => {
    const parsed = parseDecimalInput(raw, SCALE.fiat)
    if (parsed === null) {
      ctx.addIssue({ code: 'custom', message: __ENTITY_NAME___MESSAGE_KEYS.amountInvalid })
      return z.NEVER
    }
    return parsed
  }),
  currency: z
    .string()
    .transform((raw) => normalizeText(raw).toUpperCase())
    .pipe(z.string().refine(isIsoCurrency, __ENTITY_NAME___MESSAGE_KEYS.currencyInvalid)),
  clientRequestId: z.uuid(),
})
export type Create__EntityName__Input = z.infer<typeof Create__EntityName__Input>
