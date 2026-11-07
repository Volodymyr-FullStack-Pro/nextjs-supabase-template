import { LoaderCircleIcon } from 'lucide-react'
import type { ComponentProps } from 'react'

import { Button } from '@/shared/ui/button'

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, 'type' | 'disabled'> & {
  pending: boolean
  pendingLabel?: string
}

export function SubmitButton({ pending, pendingLabel, children, ...props }: SubmitButtonProps) {
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : null}
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  )
}
