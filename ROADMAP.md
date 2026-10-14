# ROADMAP.md

Avancer phase par phase. Cocher les tâches au fur et à mesure. Chaque phase doit se terminer avec un build qui passe et une app déployable.

## Phase 0 — Fondations
- [x] Init Vite + React + TS strict + Tailwind + ESLint/Prettier + Vitest
- [x] Thème (tokens clair/sombre) + primitives UI (Button, Input, Checkbox, Toast, Layout)
- [x] Layout : sidebar desktop / tab bar mobile, HashRouter, 6 routes vides
- [ ] Projet Supabase + migration `0001_init.sql` + RLS _(migration écrite ; création du projet et application : manuel, voir README)_
- [x] Client Supabase, auth (login, session persistée, route protégée), inscriptions désactivées _(à désactiver côté dashboard Supabase)_
- [ ] Workflow GitHub Actions → GitHub Pages ; vérifier le déploiement _(workflow écrit ; déploiement à vérifier après ajout des secrets)_
- [x] `.env.example`, README minimal

## Phase 1 — Todo (le plus simple, pose les patterns)
- [ ] Hook `useTodos` (TanStack Query, optimiste)
- [ ] Ajout rapide, cochage avec toast « Annuler », édition inline
- [ ] Échéance, priorité, filtres, réordonnancement
- [ ] Tests unitaires du hook et du filtrage

## Phase 2 — Habitudes
- [ ] CRUD habitudes, archivage
- [ ] Grille 7 jours cochable
- [ ] Streak + taux 30 jours (fonctions pures testées)
- [ ] Vue détail avec heatmap annuelle

## Phase 3 — Budget
- [ ] Catégories + budgets mensuels
- [ ] Saisie rapide de dépense (montant, puces de catégorie, date)
- [ ] Vue mensuelle : total, reste, barres par catégorie, navigation par mois
- [ ] Liste des dépenses éditable
- [ ] Tests des calculs (centimes, dépassement, mois)

## Phase 4 — Notes
- [ ] Liste + éditeur Markdown avec sauvegarde auto
- [ ] Épingler, tags, recherche plein texte
- [ ] Responsive (liste → plein écran sur mobile)

## Phase 5 — Objectifs
- [ ] CRUD objectifs + jalons
- [ ] Progression calculée, regroupement par horizon, statuts

## Phase 6 — « Aujourd'hui » + finitions
- [ ] Page d'accueil synthèse (todos du jour, habitudes du jour, budget du mois)
- [ ] Bouton « + » global et raccourcis clavier
- [ ] Export JSON/CSV
- [ ] Passe accessibilité, perf (Lighthouse > 90), états vides
- [ ] 2-3 tests e2e Playwright (ajout todo, cochage habitude, ajout dépense)

## Backlog (idées, ne pas implémenter sans validation)
- Palette de commandes `Cmd/Ctrl+K`
- Dépenses récurrentes et revenus
- PWA installable (hors-ligne léger)
- Revue hebdomadaire
- Liens entre éléments (todo ↔ objectif, note ↔ objectif)
