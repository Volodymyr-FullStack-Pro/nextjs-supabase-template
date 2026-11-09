'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { Button } from '@/shared/ui/button'
import { failureMessage } from '@/shared/ui/form/messages'

import { signOut } from './actions'
import { authMessages } from './messages'

export function SignOutButton() {
  const { execute, isPending } = useAction(signOut, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(failureMessage(error.serverError, authMessages))
    },
  })
  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => {
        execute()
      }}
    >
      Выйти
    </Button>
  )
}
