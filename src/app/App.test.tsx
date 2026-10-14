import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { App } from './App'

describe('App', () => {
  it("affiche Aujourd'hui puis navigue vers Budget", async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: "Aujourd'hui" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Budget' }))
    expect(await screen.findByRole('heading', { name: 'Budget' })).toBeInTheDocument()
  })
})
