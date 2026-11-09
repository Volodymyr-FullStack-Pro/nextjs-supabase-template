'use client'

import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { Button } from '@/shared/ui/button'

import { signOut } from './actions'

export function SignOutButton() {
  const { execute, isPending } = useAction(signOut, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError)
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
