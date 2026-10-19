# CLAUDE.md — Brainy

Dashboard personnel minimaliste : objectifs, notes, habitudes, todo, dépenses & budgets.
Usage mono-utilisateur, desktop + mobile, ouvert tous les jours : la simplicité prime sur tout.

## Lire en premier
- `PRODUCT.md` : vision, périmètre, specs par onglet
- `UX_GUIDELINES.md` : règles d'UI/UX (non négociables)
- `ARCHITECTURE.md` : stack, structure du repo, décisions
- `DATA_MODEL.md` : schéma SQL + RLS
- `ROADMAP.md` : phases et tâches ; avancer phase par phase

## Stack (voir ARCHITECTURE.md pour le détail)
- Front : Vite + React + TypeScript, React Router (HashRouter pour GitHub Pages), TanStack Query
- Style : Tailwind CSS, pas de lib de composants lourde (shadcn/ui ponctuellement si utile)
- Back/DB : Supabase (Postgres + Auth + RLS), client `@supabase/supabase-js`
- Déploiement : GitHub Pages via GitHub Actions
- Gestionnaire de paquets : pnpm

## Commandes
- `pnpm dev` : serveur de dev
- `pnpm build` : build de prod (doit passer sans warning TS)
- `pnpm lint` / `pnpm typecheck` / `pnpm test`
- Les migrations SQL vivent dans `supabase/migrations/`

## Conventions
- TypeScript strict, pas de `any`
- Structure par feature : `src/features/<goals|notes|habits|todos|budget>/`
- Composants UI génériques dans `src/components/ui/`
- Accès données uniquement via des hooks de feature (`useTodos`, `useHabits`…), jamais de requête Supabase directe dans un composant
- Montants stockés en centimes (entiers), jamais en float
- Dates : `date` ISO (YYYY-MM-DD) pour les jours, `timestamptz` pour les événements ; fuseau Europe/Paris pour l'affichage
- Textes de l'UI en français
- Commits atomiques, messages conventionnels (`feat:`, `fix:`, `chore:`)

## Règles de travail
- Ne jamais committer de secrets ; `.env.local` ignoré, fournir `.env.example`
- Seule la clé `anon` Supabase est exposée côté client ; la sécurité repose sur la RLS
- Avant d'ajouter une dépendance, justifier le besoin (le bundle doit rester léger)
- Chaque écran doit être utilisable en moins de 2 clics pour l'action principale
- Ne pas ajouter de fonctionnalité hors `PRODUCT.md` sans le demander ; noter les idées dans `ROADMAP.md` section « Backlog »
- Mettre à jour `ROADMAP.md` (cocher les tâches) à la fin de chaque phase
