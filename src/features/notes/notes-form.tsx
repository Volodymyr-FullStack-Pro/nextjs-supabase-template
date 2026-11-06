'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { toast } from 'sonner'
import { TextField } from '@/components/form/text-field'
import { Button } from '@/components/ui/button'
import { addNote } from './action'
import { AddNoteInput } from './schema'

/** Форма: react-hook-form + Zod на клиенте, тот же Zod в action; ошибки сервера — в toast, ошибки полей — под полем. */
export function NotesForm() {
  const { form, action, handleSubmitWithAction, resetFormAndAction } = useHookFormAction(
    addNote,
    zodResolver(AddNoteInput),
    {
      formProps: { defaultValues: { title: '' } },
      actionProps: {
        onSuccess: () => {
          toast.success('Заметка сохранена')
          resetFormAndAction()
        },
        onError: ({ error }) => {
          if (error.serverError) toast.error(error.serverError)
        },
      },
    },
  )

  return (
    <form onSubmit={(e) => void handleSubmitWithAction(e)} className="flex flex-col gap-4">
      <TextField
        control={form.control}
        name="title"
        label="Новая заметка"
        placeholder="Заголовок"
        maxLength={200}
      />
      <Button type="submit" disabled={action.isPending}>
        {action.isPending ? 'Сохраняю…' : 'Добавить'}
      </Button>
    </form>
  )
}
