import { act, renderHook, waitFor } from '@testing-library/react'
import { applyTheme, readStoredTheme, THEME_KEY, useTheme } from './theme'

describe('thème', () => {
  beforeEach(() => {
    localStorage.clear()
    applyTheme('light')
  })

  it('ignore une valeur enregistrée invalide', () => {
    localStorage.setItem(THEME_KEY, 'violet')
    expect(readStoredTheme()).toBeNull()
  })

  it('bascule, applique sur <html> et mémorise le choix', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('light')

    act(() => result.current.toggle())

    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(readStoredTheme()).toBe('dark')

    act(() => result.current.toggle())
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('synchronise les autres boutons quand le thème change ailleurs', async () => {
    const a = renderHook(() => useTheme())
    const b = renderHook(() => useTheme())
    act(() => a.result.current.toggle())
    await waitFor(() => expect(b.result.current.theme).toBe('dark'))
  })
})
