'use server'

import { redirect } from 'next/navigation'
import { ActionError, actionClient } from '@/lib/safe-action'
import { createClient } from '@/lib/supabase/server'
import { SignInInput } from './schema'

/** Вход по почте и паролю. Публичный action (без сессии), поэтому actionClient, а не authActionClient. */
export const signIn = actionClient.inputSchema(SignInInput).action(async ({ parsedInput }) => {
  let supabase
  try {
    supabase = await createClient()
  } catch {
    throw new ActionError('Supabase не настроен: заполните .env.local по образцу .env.example')
  }
  const { error } = await supabase.auth.signInWithPassword(parsedInput)
  if (error) throw new ActionError('Неверная почта или пароль')
  redirect('/notes')
})
