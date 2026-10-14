# Cockpit

Dashboard personnel minimaliste : objectifs, notes, habitudes, todo, dépenses & budgets.
Voir `PRODUCT.md`, `ARCHITECTURE.md`, `DATA_MODEL.md` et `ROADMAP.md`.

## Démarrage

```sh
pnpm install
cp .env.example .env.local   # renseigner l'URL et la clé anon Supabase
pnpm dev                     # http://localhost:5173/Brainy/
```

| Commande | Rôle |
|---|---|
| `pnpm build` | build de prod (`tsc` + Vite) |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript strict |
| `pnpm test` | tests unitaires et composants (Vitest) |
| `pnpm test:e2e` | parcours critiques + contrôle d'accessibilité axe (Playwright, desktop et mobile) |

Les tests e2e n'utilisent pas votre base : les appels à Supabase sont servis par un faux en mémoire
(`e2e/fakeSupabase.ts`). Avant la première exécution : `pnpm exec playwright install chromium`
(ou `PLAYWRIGHT_CHROMIUM_PATH=/chemin/vers/chromium` si Chromium est déjà installé).

## Design « Liquid glass »

Panneaux de verre dépoli sur un fond animé three.js (orbe irisé + aurore), thème clair/sombre
(suit le système, bouton de bascule mémorisé). Détails et règles : `UX_GUIDELINES.md`.

- Le fond n'est chargé qu'avec un GPU, au repos du navigateur et hors mode économie de données ;
  sinon un dégradé CSS le remplace. Image fixe si les animations sont réduites ou si l'appareil peine.
- Débogage sans GPU (machine virtuelle) : `localStorage.setItem('cockpit.webgl', 'force')`.

## Raccourcis clavier (desktop)

`n` ajout rapide (todo, note, dépense) · `/` rechercher dans les notes · `g` puis `a` `o` `n` `h` `t` `b`
pour changer d'onglet · `?` liste des raccourcis · `Échap` fermer.

## Données

- Export : accueil → « Compte et données » → JSON (sauvegarde complète) ou CSV des dépenses
  (format tableur français : `;` et virgule décimale).
- Montants stockés en centimes ; jours en `YYYY-MM-DD`, fuseau Europe/Paris.

## Mise en place de Supabase (une fois)

1. Créer un projet Supabase, puis exécuter `supabase/migrations/0001_init.sql` (éditeur SQL ou CLI).
2. Auth → créer l'utilisateur (email/mot de passe), puis **désactiver les inscriptions publiques**
   (Authentication → Sign In / Providers → désactiver « Allow new users to sign up »).
3. Récupérer l'URL et la clé `anon` / publishable (bouton **Connect** du projet, ou Project Settings → API Keys).

## Déploiement (GitHub Pages)

1. Settings → Pages → Source : **GitHub Actions**.
2. Settings → Secrets and variables → Actions : ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. Un push sur `main` lance `.github/workflows/deploy.yml` (lint, typecheck, tests, e2e, build, déploiement).

`base` vaut `/Brainy/` (nom du repo) ; surcharger avec `VITE_BASE` si le repo est renommé.
