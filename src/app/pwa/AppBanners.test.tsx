import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppBanners } from './AppBanners'
import { setUpdateReady } from './updateStore'

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => value })
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

describe('AppBanners', () => {
  afterEach(() => {
    act(() => {
      setOnline(true)
      setUpdateReady(null)
    })
  })

  it('n’affiche rien en ligne et à jour', () => {
    const { container } = render(<AppBanners />)
    expect(container).toBeEmptyDOMElement()
  })

  it('signale le hors ligne puis le retour du réseau', () => {
    render(<AppBanners />)
    act(() => setOnline(false))
    expect(screen.getByRole('status')).toHaveTextContent('Hors ligne.')
    act(() => setOnline(true))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('propose de recharger quand une nouvelle version est prête', async () => {
    const apply = vi.fn()
    render(<AppBanners />)
    act(() => setUpdateReady(apply))
    expect(screen.getByRole('status')).toHaveTextContent('Nouvelle version disponible')
    await userEvent.click(screen.getByRole('button', { name: 'Recharger' }))
    expect(apply).toHaveBeenCalledOnce()
  })
})
