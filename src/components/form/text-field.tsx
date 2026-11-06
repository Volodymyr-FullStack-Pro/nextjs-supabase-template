'use client'

import type { ComponentProps } from 'react'
import { Controller, type Control, type FieldPathByValue, type FieldValues } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

type TextFieldProps<T extends FieldValues> = {
  control: Control<T>
  name: FieldPathByValue<T, string>
  label: string
} & Omit<
  ComponentProps<typeof Input>,
  'name' | 'id' | 'value' | 'onChange' | 'onBlur' | 'ref' | 'aria-invalid'
>

/** Текстовое поле формы на react-hook-form: подпись, ввод и ошибка валидации в одном месте. */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: TextFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          <Input {...inputProps} {...field} id={field.name} aria-invalid={fieldState.invalid} />
          {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
        </Field>
      )}
    />
  )
}
