'use client'

import Image from 'next/image'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'

import { SubmitButton } from '@/shared/ui/form/submit-button'

import { startTotpSetup } from './actions'
import { TotpCodeForm } from './totp-code-form'

const QR_CODE_SIZE_PX = 192

export function TotpSetup() {
  const start = useAction(startTotpSetup, {
    onError: ({ error }) => {
      if (error.serverError) toast.error(error.serverError)
    },
  })
  const enrollment = start.result.data

  if (!enrollment) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          start.execute()
        }}
      >
        <SubmitButton pending={start.isPending} pendingLabel="Готовлю QR-код…">
          Подключить приложение
        </SubmitButton>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Image
        src={enrollment.qrCode}
        alt="QR-код для приложения-аутентификатора"
        width={QR_CODE_SIZE_PX}
        height={QR_CODE_SIZE_PX}
        unoptimized
        className="rounded-md bg-white p-2"
      />
      <p className="text-sm text-muted-foreground">
        Не сканируется — введите ключ вручную:{' '}
        <code className="font-mono break-all text-foreground" aria-label="Секретный ключ">
          {enrollment.secret}
        </code>
      </p>
      <TotpCodeForm factorId={enrollment.factorId} />
    </div>
  )
}
