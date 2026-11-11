import { describe, expect, it } from 'vitest'

import { keepRequestId, resetRequestId } from '@/shared/ui/form/request-id'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u

function fakeForm(clientRequestId: string) {
  const values = { clientRequestId }
  return {
    values,
    getValues: (name: 'clientRequestId') => values[name],
    setValue: (name: 'clientRequestId', value: string) => {
      values[name] = value
    },
  }
}

describe('request id of a form', () => {
  it('creates the id on the first submit', () => {
    const form = fakeForm('')

    keepRequestId(form)

    expect(form.values.clientRequestId).toMatch(UUID)
  })

  it('keeps the same id when the form is submitted again', () => {
    const form = fakeForm('')
    keepRequestId(form)
    const first = form.values.clientRequestId

    keepRequestId(form)

    expect(form.values.clientRequestId).toBe(first)
  })

  it('resets the id so that the next submit creates a new record', () => {
    const form = fakeForm('')
    keepRequestId(form)
    const first = form.values.clientRequestId

    resetRequestId(form)
    keepRequestId(form)

    expect(form.values.clientRequestId).toMatch(UUID)
    expect(form.values.clientRequestId).not.toBe(first)
  })
})
