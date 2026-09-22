// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react'
import BankGate from './BankGate.jsx'
import * as content from '../content/index.js'
import { LanguageProvider } from '../i18n/index.jsx'

// Mock de la lib content
vi.mock('../content/index.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getCategory: vi.fn(),
    isBankReady: vi.fn(),
    loadBank: vi.fn(),
  }
})

describe('BankGate', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    content.getCategory.mockReturnValue(true)
    content.isBankReady.mockReturnValue(false)
    content.loadBank.mockReturnValue(new Promise(() => {}))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('renders children immediately if bank is ready', () => {
    content.isBankReady.mockReturnValue(true)
    render(
      <LanguageProvider lang="fr">
        <BankGate categoryId="culture-generale">
          <div data-testid="child">Ready!</div>
        </BankGate>
      </LanguageProvider>
    )
    expect(screen.getByTestId('child')).not.toBeNull()
    expect(content.loadBank).not.toHaveBeenCalled()
  })

  it('shows error if category is unknown', () => {
    content.getCategory.mockReturnValue(false) // invalid category
    render(
      <LanguageProvider lang="fr">
        <BankGate categoryId="unknown" onHome={() => {}}>
          <div data-testid="child">Ready!</div>
        </BankGate>
      </LanguageProvider>
    )
    expect(screen.queryByTestId('child')).toBeNull()
    // Test that the invalid bank error text is shown
    expect(screen.getByRole('alert')).not.toBeNull()
  })

  it('loads bank and shows children when resolved', async () => {
    let resolveLoad
    const loadPromise = new Promise(resolve => { resolveLoad = resolve })
    content.loadBank.mockReturnValue(loadPromise)
    
    render(
      <LanguageProvider lang="fr">
        <BankGate categoryId="culture-generale">
          <div data-testid="child">Ready!</div>
        </BankGate>
      </LanguageProvider>
    )
    
    expect(screen.queryByTestId('child')).toBeNull()
    // It should be loading
    
    resolveLoad()
    
    await waitFor(() => {
      expect(screen.getByTestId('child')).not.toBeNull()
    })
  })

  it('shows error state if loading fails, and allows retry', async () => {
    let rejectLoad
    content.loadBank.mockReturnValueOnce(new Promise((_, reject) => { rejectLoad = reject }))
    
    render(
      <LanguageProvider lang="fr">
        <BankGate categoryId="culture-generale">
          <div data-testid="child">Ready!</div>
        </BankGate>
      </LanguageProvider>
    )
    
    rejectLoad(new Error('Network error'))
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).not.toBeNull()
    })
    
    // Check retry button exists
    const retryBtn = screen.getByRole('button', { name: /try again|réessayer/i })
    expect(retryBtn).not.toBeNull()
    
    // Mock successful load on retry
    let resolveLoad
    content.loadBank.mockReturnValueOnce(new Promise(resolve => { resolveLoad = resolve }))
    
    fireEvent.click(retryBtn)
    
    resolveLoad()
    
    await waitFor(() => {
      expect(screen.getByTestId('child')).not.toBeNull()
    })
  })
})
