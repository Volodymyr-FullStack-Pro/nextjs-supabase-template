import { Suspense } from 'react'

import { SignOutButton } from '@/modules/auth/ui/sign-out-button'
import { TotpSetupGuard } from '@/modules/auth/ui/totp-setup-guard'

export default function MfaSetupPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Второй фактор</h1>
      <p className="text-muted-foreground">
        Вход защищается кодом из приложения-аутентификатора (Google Authenticator, 1Password,
        Aegis): отсканируйте QR-код и введите шесть цифр, которые покажет приложение.
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Проверяю…</p>}>
        <TotpSetupGuard />
      </Suspense>
      <SignOutButton />
    </main>
  )
}
