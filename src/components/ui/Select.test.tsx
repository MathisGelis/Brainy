import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Select } from './Select'

const FRUITS = [
  { value: 'a', label: 'Abricot' },
  { value: 'b', label: 'Banane' },
  { value: 'c', label: 'Cerise' },
]

function Harness({
  onChange = () => {},
  initial = 'a',
}: {
  onChange?: (v: string) => void
  initial?: string
}) {
  const [value, setValue] = useState(initial)
  return (
    <Select
      label="Fruit"
      value={value}
      placeholder="Choisir…"
      options={FRUITS}
      onChange={(v) => {
        setValue(v)
        onChange(v)
      }}
    />
  )
}

describe('Select', () => {
  it('affiche la valeur, ouvre la liste au clic et choisit une option', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const box = screen.getByRole('combobox', { name: 'Fruit' })
    expect(box).toHaveTextContent('Abricot')
    expect(box).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(box)
    expect(box).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('option', { name: 'Abricot' })).toHaveAttribute('aria-selected', 'true')

    await userEvent.click(screen.getByRole('option', { name: 'Cerise' }))
    expect(onChange).toHaveBeenCalledWith('c')
    expect(box).toHaveTextContent('Cerise')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(box).toHaveFocus()
  })

  it('se pilote au clavier : flèches, Entrée, Échap, Fin', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    screen.getByRole('combobox').focus()

    await userEvent.keyboard('{ArrowDown}')
    const box = screen.getByRole('combobox')
    expect(box).toHaveAttribute('aria-expanded', 'true')
    await userEvent.keyboard('{ArrowDown}')
    expect(box.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: 'Banane' }).id,
    )
    await userEvent.keyboard('{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('b')

    await userEvent.keyboard('{ArrowDown}{End}{Escape}')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).toHaveBeenCalledTimes(1)

    await userEvent.keyboard('{End}{Enter}')
    expect(onChange).toHaveBeenLastCalledWith('c')
  })

  it('va à une option en tapant ses premières lettres', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    screen.getByRole('combobox').focus()
    await userEvent.keyboard('c')
    expect(onChange).toHaveBeenLastCalledWith('c')
  })

  it('montre le texte d’attente quand aucune option ne correspond, et se ferme au clic dehors', async () => {
    render(
      <>
        <Harness initial="" />
        <p>Ailleurs</p>
      </>,
    )
    const box = screen.getByRole('combobox')
    expect(box).toHaveTextContent('Choisir…')
    await userEvent.click(box)
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Ailleurs'))
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
