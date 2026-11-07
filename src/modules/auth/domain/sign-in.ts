import { z } from 'zod'

export const SignInInput = z.object({
  email: z.email('Проверьте почту'),
  password: z.string().min(1, 'Введите пароль'),
})
export type SignInInput = z.infer<typeof SignInInput>
