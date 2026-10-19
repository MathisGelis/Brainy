import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { installFakeSupabase, parisToday, STORAGE_KEY, SUPABASE_URL } from './fakeSupabase'

const seed = {
  todos: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      list_id: null,
      title: 'Payer le loyer',
      done: false,
      done_at: null,
      due_date: parisToday(),
      focus_on: parisToday(),
      priority: 'normal',
      position: 0,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
}

test('manifest : installable en plein écran, avec icônes', async ({ request }) => {
  const manifest = await (await request.get('manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ name: 'Brainy', display: 'standalone', start_url: './' })
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes)
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']))
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true)
})

test('hors ligne : l’app s’ouvre, les dernières données restent lisibles, en lecture seule', async ({
  page,
  context,
}) => {
  await installFakeSupabase(page, seed)
  await page.goto('')
  const loyer = page
    .getByRole('region', { name: 'Top 3 du jour' })
    .getByRole('checkbox', { name: 'Terminer « Payer le loyer »' })
  await expect(loyer).toBeVisible()
  // Le service worker prend la main au chargement suivant, qui remplit le cache des lectures.
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect(loyer).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Hors ligne' })).toHaveCount(0)

  // Coupure réseau ; jeton expiré entre-temps (cas d'une app rouverte le lendemain).
  await context.unrouteAll({ behavior: 'ignoreErrors' })
  await context.route(`${SUPABASE_URL}/**`, (route) => route.abort('internetdisconnected'))
  await context.setOffline(true)
  await page.evaluate((key) => {
    const session = JSON.parse(localStorage.getItem(key)!)
    localStorage.setItem(key, JSON.stringify({ ...session, expires_at: 1 }))
  }, STORAGE_KEY)
  await page.reload()

  await expect(page.getByRole('heading', { name: "Aujourd'hui", level: 1 })).toBeVisible()
  await expect(loyer).toBeVisible()
  await expect(page.getByRole('status').filter({ hasText: 'Hors ligne.' })).toBeVisible()
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(axe.violations.map((v) => v.id)).toEqual([])

  await loyer.click()
  await expect(
    page.getByText('Hors ligne : la modification n’a pas été enregistrée.'),
  ).toBeVisible()
  await expect(loyer).not.toBeChecked()

  // Retour du réseau : le bandeau disparaît.
  await context.setOffline(false)
  await expect(page.getByRole('status').filter({ hasText: 'Hors ligne.' })).toHaveCount(0)
})
