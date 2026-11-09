'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { toast } from 'sonner'

import { failureMessage } from '@/shared/ui/form/messages'
import { SubmitButton } from '@/shared/ui/form/submit-button'
import { TextField } from '@/shared/ui/form/text-field'

import { TotpCodeInput } from '../domain/totp'
import { verifyTotpCode } from './actions'
import { authMessages } from './messages'

const CODE_WITH_SPACE_MAX_LENGTH = 7

export function TotpCodeForm({ factorId }: { factorId?: string }) {
  const { form, action, handleSubmitWithAction } = useHookFormAction(
    verifyTotpCode,
    zodResolver(TotpCodeInput),
    {
      formProps: { defaultValues: { code: '', ...(factorId ? { factorId } : {}) } },
      actionProps: {
        onError: ({ error }) => {
          if (error.serverError) toast.error(failureMessage(error.serverError, authMessages))
        },
      },
    },
  )

  return (
    <form onSubmit={(event) => void handleSubmitWithAction(event)} className="flex flex-col gap-4">
      <TextField
        control={form.control}
        messages={authMessages}
        name="code"
        label="Код из приложения"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={CODE_WITH_SPACE_MAX_LENGTH}
      />
      <SubmitButton pending={action.isPending} pendingLabel="Проверяю…">
        Подтвердить
      </SubmitButton>
    </form>
  )
}
