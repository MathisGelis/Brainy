# ROADMAP.md

Avancer phase par phase. Cocher les tâches au fur et à mesure. Chaque phase doit se terminer avec un build qui passe et une app déployable.

## Phase 0 — Fondations
- [x] Init Vite + React + TS strict + Tailwind + ESLint/Prettier + Vitest
- [x] Thème (tokens clair/sombre) + primitives UI (Button, Input, Checkbox, Toast, Layout)
- [x] Layout : sidebar desktop / tab bar mobile, HashRouter, 6 routes vides
- [x] Projet Supabase + migration `0001_init.sql` + RLS
- [x] Client Supabase, auth (login, session persistée, route protégée), inscriptions désactivées _(à désactiver côté dashboard Supabase)_
- [ ] Workflow GitHub Actions → GitHub Pages ; vérifier le déploiement _(workflow écrit ; déploiement à vérifier après ajout des secrets)_
- [x] `.env.example`, README minimal

## Phase 1 — Todo (le plus simple, pose les patterns)
- [x] Hook `useTodos` (TanStack Query, optimiste)
- [x] Ajout rapide, cochage avec toast « Annuler », édition inline
- [x] Échéance, priorité, filtres, réordonnancement
- [x] Tests unitaires du hook et du filtrage

_Reste pour plus tard : liste/projet par todo (champ `list_id` déjà en base), voir Backlog._

## Phase 2 — Habitudes
- [x] CRUD habitudes, archivage
- [x] Grille 7 jours cochable
- [x] Streak + taux 30 jours (fonctions pures testées)
- [x] Vue détail avec heatmap annuelle

## Phase 3 — Budget
- [x] Catégories + budgets mensuels
- [x] Saisie rapide de dépense (montant, puces de catégorie, date)
- [x] Vue mensuelle : total, reste, barres par catégorie, navigation par mois
- [x] Liste des dépenses éditable
- [x] Tests des calculs (centimes, dépassement, mois)

## Phase 4 — Notes
- [x] Liste + éditeur Markdown avec sauvegarde auto
- [x] Épingler, tags, recherche plein texte
- [x] Responsive (liste → plein écran sur mobile)

_Recherche faite côté client (instantanée, sans accents, `#tag`) : suffisant au volume mono-utilisateur ; l'index GIN reste disponible si besoin._

## Phase 5 — Objectifs
- [x] CRUD objectifs + jalons
- [x] Progression calculée, regroupement par horizon, statuts

## Phase 6 — « Aujourd'hui » + finitions
- [x] Page d'accueil synthèse (todos du jour, habitudes du jour, budget du mois)
- [x] Bouton « + » global et raccourcis clavier
- [x] Export JSON/CSV
- [x] Passe accessibilité, perf (Lighthouse > 90), états vides
- [x] 2-3 tests e2e Playwright (ajout todo, cochage habitude, ajout dépense)

_Lighthouse (mobile, build de prod) sur la page de connexion : performance 97, accessibilité 100. Les pages connectées sont vérifiées par axe-core (WCAG A/AA) dans les tests e2e, desktop et mobile. Les tests e2e tournent sur un faux Supabase en mémoire (`e2e/fakeSupabase.ts`)._

## Backlog (idées, ne pas implémenter sans validation)
- Palette de commandes `Cmd/Ctrl+K`
- Dépenses récurrentes et revenus
- PWA installable (hors-ligne léger)
- Revue hebdomadaire
- Listes/projets pour les todos (`todo_lists`, spec PRODUCT.md)
- Liens entre éléments (todo ↔ objectif, note ↔ objectif)
