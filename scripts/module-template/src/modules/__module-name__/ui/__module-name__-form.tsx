'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { toast } from 'sonner'

import { failureMessage } from '@/shared/ui/form/messages'
import { SubmitButton } from '@/shared/ui/form/submit-button'
import { TextField } from '@/shared/ui/form/text-field'

import {
  __ENTITY_NAME___CURRENCY_LENGTH,
  __ENTITY_NAME___MESSAGE_KEYS,
  __ENTITY_NAME___TITLE_MAX,
  Create__EntityName__Input,
} from '../domain/__entity-name__'
import { add__EntityName__ } from './actions'
import { __moduleName__Messages } from './messages'

const EMPTY___ENTITY_NAME__ = { title: '', amount: '', currency: 'EUR', clientRequestId: '' }

export function __ModuleName__Form() {
  const { form, action, handleSubmitWithAction, resetFormAndAction } = useHookFormAction(
    add__EntityName__,
    zodResolver(Create__EntityName__Input),
    {
      formProps: { defaultValues: EMPTY___ENTITY_NAME__ },
      actionProps: {
        onSuccess: () => {
          toast.success('Сохранено')
          resetFormAndAction()
        },
        onError: ({ error }) => {
          if (error.validationErrors !== undefined) return
          toast.error(failureMessage(error.serverError, __moduleName__Messages))
          if (error.serverError?.rule === __ENTITY_NAME___MESSAGE_KEYS.requestReused) {
            form.setValue('clientRequestId', '')
          }
        },
      },
    },
  )
  const notSaved = action.hasErrored && action.result.validationErrors === undefined
  const keepRequestId = () => {
    if (form.getValues('clientRequestId') === '') {
      form.setValue('clientRequestId', crypto.randomUUID())
    }
  }

  return (
    <form
      onSubmit={(event) => {
        keepRequestId()
        void handleSubmitWithAction(event)
      }}
      className="flex flex-col gap-4"
    >
      <TextField
        control={form.control}
        messages={__moduleName__Messages}
        name="title"
        label="Название"
        maxLength={__ENTITY_NAME___TITLE_MAX}
      />
      <TextField
        control={form.control}
        messages={__moduleName__Messages}
        name="amount"
        label="Сумма"
        placeholder="0,00"
        inputMode="decimal"
        autoComplete="off"
      />
      <TextField
        control={form.control}
        messages={__moduleName__Messages}
        name="currency"
        label="Валюта"
        placeholder="EUR"
        maxLength={__ENTITY_NAME___CURRENCY_LENGTH}
        autoCapitalize="characters"
        autoComplete="off"
      />
      {notSaved ? (
        <p role="alert" className="text-sm text-destructive">
          {failureMessage(action.result.serverError, __moduleName__Messages)}
        </p>
      ) : null}
      <SubmitButton pending={action.isPending} pendingLabel="Сохраняю…">
        Добавить
      </SubmitButton>
    </form>
  )
}
