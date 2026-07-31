import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactElement } from 'react'
import { ErrorBoundary } from './ErrorBoundary'

function BrokenView(): ReactElement {
  throw new Error('private rendering detail')
}

describe('ErrorBoundary', () => {
  it('shows a safe recovery view without rendering the error detail', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary>
        <BrokenView />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeVisible()
    expect(screen.queryByText('private rendering detail')).not.toBeInTheDocument()
  })

  it('supports an isolated fallback for optional panels', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    render(
      <ErrorBoundary fallback={<div>Panel fallback</div>}>
        <BrokenView />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Panel fallback')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument()
  })
})
