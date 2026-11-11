type RequestIdForm = {
  getValues: (name: 'clientRequestId') => string
  setValue: (name: 'clientRequestId', value: string) => void
}

export function keepRequestId(form: RequestIdForm): void {
  if (form.getValues('clientRequestId') === '') {
    form.setValue('clientRequestId', crypto.randomUUID())
  }
}

export function resetRequestId(form: RequestIdForm): void {
  form.setValue('clientRequestId', '')
}
