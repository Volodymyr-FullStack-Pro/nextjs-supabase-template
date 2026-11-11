import { RuleViolationError } from '@/shared/domain/errors'
import { exceedsCurrencyPrecision, money } from '@/shared/domain/money'
import { err, ok, type Result } from '@/shared/domain/result'
import { hasLettersOrDigits } from '@/shared/domain/text'

import {
  __ENTITY_NAME___MESSAGE_KEYS,
  type __EntityName__,
  type Create__EntityName__Input,
} from '../domain/__entity-name__'
import type { __ModuleName__Repository } from './__module-name__-repository'

export type Create__EntityName__Error = RuleViolationError

const savedAsSubmitted = (saved: __EntityName__, input: Create__EntityName__Input) =>
  saved.title === input.title &&
  saved.currency === input.currency &&
  money(saved.amount).eq(input.amount)

export function makeCreate__EntityName__({
  __moduleName__,
}: {
  __moduleName__: __ModuleName__Repository
}) {
  return async (
    input: Create__EntityName__Input,
    ctx: { userId: string },
  ): Promise<Result<__EntityName__, Create__EntityName__Error>> => {
    if (!hasLettersOrDigits(input.title)) {
      return err(new RuleViolationError(__ENTITY_NAME___MESSAGE_KEYS.titleMeaningless))
    }
    if (exceedsCurrencyPrecision(input.amount, input.currency)) {
      return err(new RuleViolationError(__ENTITY_NAME___MESSAGE_KEYS.amountTooPrecise))
    }
    const { __entityName__, repeatedRequest } = await __moduleName__.insert({
      ...input,
      ownerId: ctx.userId,
    })
    if (repeatedRequest && !savedAsSubmitted(__entityName__, input)) {
      return err(new RuleViolationError(__ENTITY_NAME___MESSAGE_KEYS.requestReused))
    }
    return ok(__entityName__)
  }
}
