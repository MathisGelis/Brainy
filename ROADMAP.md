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

## Refonte visuelle « Liquid glass »
- [x] Tokens clair/sombre, matières de verre (`glass`, `sheet`, `card`, `field`, `pill`), bascule de thème mémorisée
- [x] Navigation flottante (sidebar / tab bar) avec indicateur glissant, icônes, bouton « + » en verre
- [x] Fond three.js (orbe irisé, aurore, onde de célébration), chargé au repos, uniquement avec GPU
- [x] Contraste AA vérifié dans les deux thèmes (axe), Lighthouse sans GPU : perf 97, a11y 100

## Phase 7 — Enrichissements (migration `0002_enrichissements.sql`)
- [x] Migration 0002 (récurrences, revenus, jours off, quantités, liens objectifs, done_at des jalons)
- [x] Todo : saisie en langage naturel, report en un geste, récurrence, listes/projets, objectif lié
- [x] Budget : saisie en langage naturel, rythme (projection + variation), revenus et solde, récurrences, suppression de catégorie
- [x] Habitudes : jours précis, jours off, habitudes chiffrées, suppression avec annulation
- [x] Notes : cases à cocher dans l'aperçu, note du jour
- [x] Objectifs : todos/habitudes liées, prochain jalon sur l'accueil
- [x] Palette de commandes `Cmd/Ctrl+K`
- [x] Revue de la semaine
- [x] Tests (unitaires, e2e, axe dans les deux thèmes), Lighthouse

## Phase 8 — Rituels, épargne, calendrier (migration `0003_rituels_epargne.sql`)
- [x] Migration 0003 (Top 3, humeur/énergie, cagnottes)
- [x] Dépenses récurrentes dans la saisie principale (interrupteur + langage naturel)
- [x] Top 3 du jour + rituels du matin et du soir
- [x] Humeur et énergie + liens dans la revue de la semaine
- [x] Cagnottes d'épargne
- [x] Vue calendrier
- [x] Tests (unitaires, e2e, axe dans les deux thèmes), Lighthouse

## Phase 9 — Semaine et victoires (migration `0004_victoires_semaine.sql`)
- [x] Migration 0004 (victoire du jour, priorités de la semaine)
- [x] Catégorie devinée d'après l'historique des dépenses
- [x] Victoire du jour (rituel du soir, calendrier, revue)
- [x] Planification de la semaine (ce qui traîne, 3 priorités, répartition sur les jours)
- [x] Tests (unitaires, e2e, axe dans les deux thèmes), Lighthouse

## Phase 10 — Menu et macros (migration `0005_menu.sql`)
- [x] Migration 0005 (aliments, repas, objectifs de macros)
- [x] Base d'aliments courants + saisie en langage naturel
- [x] Écran Menu : repas du jour, semaine, tracker de macros, objectifs, mes aliments
- [x] Liste de courses alimentée depuis le menu
- [x] Tests (unitaires, e2e, axe dans les deux thèmes), Lighthouse

## Phase 11 — Recettes, copie de menu, courses → budget (migration `0006_recettes.sql`)
- [x] Migration 0006 (recettes, ingrédients, lien repas → recette)
- [x] Recettes et repas types
- [x] Copier un jour ou la semaine précédente
- [x] Des courses au budget
- [x] Kcal restantes et prochain repas sur l'accueil
- [x] Tests (unitaires, e2e, axe dans les deux thèmes), Lighthouse

## Backlog (idées, ne pas implémenter sans validation)
- PWA installable (hors-ligne léger)
- Restauration d'une sauvegarde JSON
- Minuteur de concentration (Pomodoro)
- Abonnements (coût annuel), anniversaires, suivis chiffrés, rétrospective annuelle, flux ICS
- Liens note ↔ objectif
- Assistant mails (Claude + Gmail) : tri et résumés, mail → todo ou dépense, brouillons validés à la main ; nécessite des Edge Functions Supabase, OAuth Google et une clé API Anthropic (« IA intégrée » est hors périmètre v1)
- Menu : recherche Open Food Facts et scan de code-barres ; quantités cumulées dans la liste de courses
