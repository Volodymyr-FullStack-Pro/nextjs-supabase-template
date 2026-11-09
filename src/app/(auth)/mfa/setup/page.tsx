import { SignOutButton } from '@/modules/auth/ui/sign-out-button'
import { TotpSetup } from '@/modules/auth/ui/totp-setup'

export default function MfaSetupPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Второй фактор</h1>
      <p className="text-muted-foreground">
        Вход защищается кодом из приложения-аутентификатора (Google Authenticator, 1Password,
        Aegis): отсканируйте QR-код и введите шесть цифр, которые покажет приложение.
      </p>
      <TotpSetup />
      <SignOutButton />
    </main>
  )
}
