'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { toast } from 'sonner'

import { SubmitButton } from '@/shared/ui/form/submit-button'
import { TextField } from '@/shared/ui/form/text-field'

import { CreateNoteInput, NOTE_TITLE_MAX } from '../domain/note'
import { addNote } from './actions'

export function NotesForm() {
  const { form, action, handleSubmitWithAction, resetFormAndAction } = useHookFormAction(
    addNote,
    zodResolver(CreateNoteInput),
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
    <form onSubmit={(event) => void handleSubmitWithAction(event)} className="flex flex-col gap-4">
      <TextField
        control={form.control}
        name="title"
        label="Новая заметка"
        placeholder="Заголовок"
        maxLength={NOTE_TITLE_MAX}
      />
      <SubmitButton pending={action.isPending} pendingLabel="Сохраняю…">
        Добавить
      </SubmitButton>
    </form>
  )
}
