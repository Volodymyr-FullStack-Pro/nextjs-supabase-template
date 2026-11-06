'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { toast } from 'sonner'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { FieldGroup } from '@/components/ui/field'
import { signIn } from './action'
import { SignInInput } from './schema'

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
    <form onSubmit={(e) => void handleSubmitWithAction(e)} className="flex flex-col gap-6">
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
