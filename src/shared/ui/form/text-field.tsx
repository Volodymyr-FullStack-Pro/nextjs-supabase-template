'use client'

import { useId, type ComponentProps } from 'react'
import { Controller, type Control, type FieldPathByValue, type FieldValues } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

type TextFieldProps<T extends FieldValues> = {
  control: Control<T>
  /** Только обязательные строковые поля схемы (string); для string | undefined — свой компонент или z.string().default(''). */
  name: FieldPathByValue<T, string>
  label: string
} & Omit<
  ComponentProps<typeof Input>,
  'name' | 'id' | 'value' | 'onChange' | 'onBlur' | 'ref' | 'aria-invalid' | 'aria-describedby'
>

/** Текстовое поле формы на react-hook-form: подпись, ввод и ошибка валидации в одном месте; id уникален на странице. */
export function TextField<T extends FieldValues>({
  control,
  name,
  label,
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
          {fieldState.invalid ? <FieldError id={errorId} errors={[fieldState.error]} /> : null}
        </Field>
      )}
    />
  )
}
