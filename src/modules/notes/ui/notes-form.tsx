'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useHookFormAction } from '@next-safe-action/adapter-react-hook-form/hooks'
import { toast } from 'sonner'

import { failureMessage } from '@/shared/ui/form/messages'
import { SubmitButton } from '@/shared/ui/form/submit-button'
import { TextField } from '@/shared/ui/form/text-field'

import { CreateNoteInput, NOTE_CURRENCY_LENGTH, NOTE_TITLE_MAX } from '../domain/note'
import { addNote } from './actions'
import { notesMessages } from './messages'

const EMPTY_NOTE = { title: '', amount: '', currency: 'EUR', clientRequestId: '' }

export function NotesForm() {
  const { form, action, handleSubmitWithAction, resetFormAndAction } = useHookFormAction(
    addNote,
    zodResolver(CreateNoteInput),
    {
      formProps: { defaultValues: EMPTY_NOTE },
      actionProps: {
        onSuccess: () => {
          toast.success('Заметка сохранена')
          resetFormAndAction()
        },
        onError: ({ error }) => {
          if (error.validationErrors === undefined) {
            toast.error(failureMessage(error.serverError, notesMessages))
          }
        },
      },
    },
  )
  const notSaved = action.hasErrored && action.result.validationErrors === undefined
  const keepRequestId = () => {
    if (form.getValues('clientRequestId') === '') {
      form.setValue('clientRequestId', crypto.randomUUID())
    }
  }

  return (
    <form
      onSubmit={(event) => {
        keepRequestId()
        void handleSubmitWithAction(event)
      }}
      className="flex flex-col gap-4"
    >
      <TextField
        control={form.control}
        messages={notesMessages}
        name="title"
        label="Новая заметка"
        placeholder="Заголовок"
        maxLength={NOTE_TITLE_MAX}
      />
      <TextField
        control={form.control}
        messages={notesMessages}
        name="amount"
        label="Сумма"
        placeholder="0,00"
        inputMode="decimal"
        autoComplete="off"
      />
      <TextField
        control={form.control}
        messages={notesMessages}
        name="currency"
        label="Валюта"
        placeholder="EUR"
        maxLength={NOTE_CURRENCY_LENGTH}
        autoCapitalize="characters"
        autoComplete="off"
      />
      {notSaved ? (
        <p role="alert" className="text-sm text-destructive">
          {failureMessage(action.result.serverError, notesMessages)}
        </p>
      ) : null}
      <SubmitButton pending={action.isPending} pendingLabel="Сохраняю…">
        Добавить
      </SubmitButton>
    </form>
  )
}
