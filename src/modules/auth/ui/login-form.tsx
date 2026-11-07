'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { toast } from 'sonner'
import { TextField } from '@/shared/ui/form/text-field'
import { Button } from '@/shared/ui/button'
import { FieldGroup } from '@/shared/ui/field'
import { signIn } from './actions'
import { SignInInput } from '../domain/sign-in'

export function LoginForm() {
  const { form, action, handleSubmitWithAction } = useHookFormAction(
    signIn,
    zodResolver(SignInInput),
    {
      formProps: { defaultValues: { email: '', password: '' } },
      actionProps: {
        onError: ({ error }) => {
          if (error.serverError) toast.error(error.serverError)
        },
      },
    },
  )

  return (
    <form onSubmit={(event) => void handleSubmitWithAction(event)} className="flex flex-col gap-6">
      <FieldGroup>
        <TextField
          control={form.control}
          name="email"
          label="Почта"
          type="email"
          autoComplete="email"
        />
        <TextField
          control={form.control}
          name="password"
          label="Пароль"
          type="password"
          autoComplete="current-password"
        />
      </FieldGroup>
      <Button type="submit" disabled={action.isPending}>
        {action.isPending ? 'Вхожу…' : 'Войти'}
      </Button>
    </form>
  )
}
