import { LoginForm } from '@/features/auth/login-form'

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-sm flex-col gap-6 p-6">
      <h1 className="text-2xl font-semibold">Вход</h1>
      <LoginForm />
    </main>
  )
}
