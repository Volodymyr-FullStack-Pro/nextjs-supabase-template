import { SignOutButton } from '@/modules/auth/ui/sign-out-button'
import { TotpCodeForm } from '@/modules/auth/ui/totp-code-form'

export default function MfaVerifyPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Код из приложения</h1>
      <p className="text-muted-foreground">
        Откройте приложение-аутентификатор и введите шесть цифр для этого аккаунта.
      </p>
      <TotpCodeForm />
      <SignOutButton />
    </main>
  )
}
