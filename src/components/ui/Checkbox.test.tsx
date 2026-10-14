import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('se coche au clic sur le libellé', async () => {
    render(<Checkbox label="Acheter du pain" />)
    await userEvent.click(screen.getByText('Acheter du pain'))
    expect(screen.getByRole('checkbox', { name: 'Acheter du pain' })).toBeChecked()
  })
})
