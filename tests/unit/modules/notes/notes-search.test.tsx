// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing'
import { describe, expect, it } from 'vitest'
import { NotesSearch } from '@/modules/notes/ui/notes-search'

/** Пример теста компонента: jsdom + Testing Library; состояние URL подменяет тестовый адаптер nuqs. */
describe('NotesSearch', () => {
  it('shows the query from the URL in the search box', () => {
    render(<NotesSearch />, { wrapper: withNuqsTestingAdapter({ searchParams: '?q=аренда' }) })
    expect(screen.getByRole('searchbox', { name: 'Поиск по заметкам' })).toHaveProperty(
      'value',
      'аренда',
    )
  })
})
