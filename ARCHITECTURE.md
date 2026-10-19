# ARCHITECTURE.md

## Contraintes de départ
- Idéalement hébergé sur GitHub Pages (statique, gratuit)
- Sinon local, mais avec une base de données partagée entre appareils
- Mono-utilisateur, volume de données faible

## Décision : SPA statique + Supabase
GitHub Pages ne sert que du statique, donc pas de backend maison. On utilise **Supabase** (Postgres managé, Auth, RLS) appelé directement depuis le navigateur. Avantages : même base accessible depuis PC et téléphone, SQL/Postgres déjà maîtrisé, zéro serveur à maintenir, free tier largement suffisant.

### Alternatives évaluées
| Option | + | − |
|---|---|---|
| **Supabase + GH Pages** (retenue) | Hébergé, partagé, gratuit, Postgres | Dépendance à un service tiers, projet free mis en pause après inactivité prolongée |
| NestJS + Postgres en local (Docker) | Contrôle total, stack connue | Pas accessible hors du PC ; pas de GH Pages |
| NestJS + Postgres sur un VPS/Fly/Railway | Contrôle total, accessible partout | Coût, maintenance, plus de code |
| Local-first (IndexedDB) + sync | Hors-ligne natif | Sync complexe, surdimensionné pour v1 |

Le code doit isoler l'accès aux données derrière des hooks/repositories pour pouvoir changer de backend sans toucher à l'UI.

## Stack
- **Front** : Vite, React 18, TypeScript strict
- **Routing** : React Router en `HashRouter` (GitHub Pages ne gère pas les rewrites SPA)
- **Data** : TanStack Query (cache + mises à jour optimistes) + `@supabase/supabase-js`
- **Style** : Tailwind CSS + variables CSS pour le thème
- **Forms/validation** : Zod (+ react-hook-form seulement si nécessaire)
- **Dates** : date-fns (locale `fr`)
- **Drag & drop** : dnd-kit (todos)
- **Markdown** : react-markdown (notes)
- **Tests** : Vitest + Testing Library ; Playwright pour 2-3 parcours critiques (phase finale)
- **CI/CD** : GitHub Actions → build → déploiement GitHub Pages
- **PWA** : `vite-plugin-pwa` (outil de build : génère le manifest et un service worker Workbox) ; seul `workbox-window` (~2 kB) est chargé, après le premier rendu

## Structure du repo
```
.
├── CLAUDE.md
├── PRODUCT.md / UX_GUIDELINES.md / ARCHITECTURE.md / DATA_MODEL.md / ROADMAP.md
├── supabase/
│   └── migrations/          # SQL versionné
├── src/
│   ├── app/                 # routes, layout, providers
│   ├── components/ui/       # primitives (Button, Input, Checkbox, Toast…)
│   ├── features/
│   │   ├── today/
│   │   ├── goals/
│   │   ├── notes/
│   │   ├── habits/
│   │   ├── todos/
│   │   └── budget/
│   ├── lib/                 # supabase client, utils, formatters (money/date)
│   └── types/               # types générés depuis la DB
├── .github/workflows/deploy.yml
├── .env.example
└── vite.config.ts           # `base` = '/<nom-du-repo>/'
```

## Sécurité
- Auth Supabase, inscriptions publiques **désactivées** après création du compte
- RLS activée sur toutes les tables : `user_id = auth.uid()`
- Seule la clé `anon` est dans le bundle ; la `service_role` n'est jamais utilisée côté client ni committée
- Variables via `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (secrets GitHub Actions pour le build)
- Repo GitHub Pages public ⇒ aucune donnée perso dans le code (tout est en base)

## Déploiement
1. Créer le projet Supabase, appliquer les migrations
2. Secrets GitHub : `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Workflow : `pnpm install` → `pnpm build` → `actions/deploy-pages`
4. Régler `base` dans `vite.config.ts` selon le nom du repo

## Mode local
`pnpm dev` pointe sur le même projet Supabase (base partagée). Optionnel : `supabase start` (CLI + Docker) pour une base 100 % locale en dev.

## Application installable (PWA)
- Service worker en mode « prompt » : nouvelle version proposée, jamais imposée ; vérifiée toutes les heures et au retour au premier plan
- Coquille de l'app (HTML, JS, CSS, icônes) en précache ; three.js (fond animé, gros bloc optionnel) en cache à la demande
- Lectures Supabase (`GET /rest/v1/…`) en « réseau d'abord » (5 s), repli sur la dernière réponse en cache ; vidé à la déconnexion
- TanStack Query en `networkMode: 'offlineFirst'` pour que les lectures passent par ce cache hors ligne
- Hors ligne, un jeton expiré ne déconnecte pas : la session reste en stockage et se rafraîchit au retour du réseau
- Icônes et écrans de lancement iPhone générés par `pnpm icons` (Chromium de Playwright) dans `public/`

## Performance & robustesse
- Mises à jour optimistes sur cochages et ajouts
- Code splitting par route (lazy)
- Export JSON/CSV de toutes les données (bouton dans un menu discret) comme filet de sécurité
- Sauvegarde : export régulier ou dump Supabase
