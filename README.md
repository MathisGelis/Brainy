# Cockpit

Dashboard personnel minimaliste : objectifs, notes, habitudes, todo, dépenses & budgets.
Voir `PRODUCT.md`, `ARCHITECTURE.md`, `DATA_MODEL.md` et `ROADMAP.md`.

## Démarrage

```sh
pnpm install
cp .env.example .env.local   # renseigner l'URL et la clé anon Supabase
pnpm dev
```

Commandes : `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.

## Mise en place de Supabase (une fois)

1. Créer un projet Supabase, puis exécuter `supabase/migrations/0001_init.sql` (éditeur SQL ou CLI).
2. Auth → créer l'utilisateur (email/mot de passe), puis **désactiver les inscriptions publiques**
   (Authentication → Sign In / Providers → désactiver « Allow new users to sign up »).
3. Récupérer l'URL et la clé `anon` (Project Settings → API).

## Déploiement (GitHub Pages)

1. Settings → Pages → Source : **GitHub Actions**.
2. Settings → Secrets and variables → Actions : ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.
3. Un push sur `main` lance `.github/workflows/deploy.yml`.

`base` vaut `/Brainy/` (nom du repo) ; surcharger avec `VITE_BASE` si le repo est renommé.
