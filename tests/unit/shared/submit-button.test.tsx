// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SubmitButton } from '@/shared/ui/form/submit-button'

describe('SubmitButton', () => {
  it('submits the form while idle', () => {
    render(<SubmitButton pending={false}>Сохранить</SubmitButton>)
    const button = screen.getByRole('button', { name: 'Сохранить' })
    expect(button.getAttribute('type')).toBe('submit')
    expect(button.hasAttribute('disabled')).toBe(false)
  })

  it('blocks repeated clicks and shows the pending label while the action runs', () => {
    render(
      <SubmitButton pending pendingLabel="Сохраняю…">
        Сохранить
      </SubmitButton>,
    )
    const button = screen.getByRole('button', { name: 'Сохраняю…' })
    expect(button.hasAttribute('disabled')).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
  })
})
