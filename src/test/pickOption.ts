import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/** Ouvre le menu déroulant `label` (composant Select) et choisit l'option affichée `option`. */
export async function pickOption(label: string, option: string) {
  await userEvent.click(screen.getByRole('combobox', { name: label }))
  await userEvent.click(screen.getByRole('option', { name: option }))
}
