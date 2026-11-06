'use client'

import { useActionState } from 'react'
import { signIn, type SignInState } from './action'

const initial: SignInState = {}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initial)
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="text-sm font-medium" htmlFor="email">
        Почта
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        className="rounded-md border px-3 py-2"
      />
      <label className="text-sm font-medium" htmlFor="password">
        Пароль
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        className="rounded-md border px-3 py-2"
      />
      <button type="submit" disabled={pending} className="rounded-md bg-black px-3 py-2 text-white">
        {pending ? 'Вхожу…' : 'Войти'}
      </button>
      {state.error ? (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
