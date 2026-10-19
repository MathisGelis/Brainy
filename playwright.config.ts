import { defineConfig, devices } from '@playwright/test'

const PORT = 5199
// Build de prod servi par `vite preview` : le seul où le service worker tourne (tests hors ligne)
const PWA_PORT = 5198
const fakeSupabaseEnv = {
  VITE_SUPABASE_URL: 'http://localhost:54321',
  VITE_SUPABASE_ANON_KEY: 'e2e-anon-key',
}
// Chromium déjà installé (ex. conteneur CI/cloud) ; sinon `pnpm exec playwright install chromium`.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/Brainy/`,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      testIgnore: /pwa\.spec/,
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
    {
      name: 'mobile',
      testIgnore: /pwa\.spec/,
      use: { ...devices['Pixel 7'], launchOptions: { executablePath } },
    },
    {
      name: 'pwa',
      testMatch: /pwa\.spec/,
      use: {
        ...devices['Pixel 7'],
        baseURL: `http://localhost:${PWA_PORT}/Brainy/`,
        launchOptions: { executablePath },
      },
    },
  ],
  // Pointent vers le faux Supabase des tests (les variables d'environnement priment sur .env.local)
  webServer: [
    {
      command: `pnpm exec vite --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}/Brainy/`,
      reuseExistingServer: !process.env.CI,
      env: fakeSupabaseEnv,
    },
    {
      command: `pnpm exec vite build --outDir dist-e2e --emptyOutDir && pnpm exec vite preview --outDir dist-e2e --port ${PWA_PORT} --strictPort`,
      url: `http://localhost:${PWA_PORT}/Brainy/`,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: fakeSupabaseEnv,
    },
  ],
})
