'use client'

import { type ComponentProps, useId } from 'react'
import { type Control, Controller, type FieldPathByValue, type FieldValues } from 'react-hook-form'

import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

import { messageFor, type Messages } from './messages'

type TextFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPathByValue<T, string>
  label: string
  messages: Messages
} & Omit<
  ComponentProps<typeof Input>,
  'name' | 'id' | 'value' | 'onChange' | 'onBlur' | 'ref' | 'aria-invalid' | 'aria-describedby'
>

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  messages,
  ...inputProps
}: TextFieldProps<T>) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>
          <Input
            {...inputProps}
            {...field}
            id={id}
            aria-invalid={fieldState.invalid}
            {...(fieldState.invalid ? { 'aria-describedby': errorId } : {})}
          />
          {fieldState.invalid ? (
            <FieldError id={errorId}>
              {messageFor(fieldState.error?.message, messages) ?? fieldState.error?.message}
            </FieldError>
          ) : null}
        </Field>
      )}
    />
  )
}
