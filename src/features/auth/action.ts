'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type SignInState = { error?: string }

const SignInInput = z.object({
  email: z.email('Проверьте почту'),
  password: z.string().min(1),
})

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const parsed = SignInInput.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Проверьте поля' }
  let supabase
  try {
    supabase = await createClient()
  } catch {
    return { error: 'Supabase не настроен: заполните .env.local по образцу .env.example' }
  }
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: 'Неверная почта или пароль' }
  redirect('/notes')
}
