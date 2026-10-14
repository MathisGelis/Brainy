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

## Mettre à jour la base

**Avant d'ouvrir une nouvelle version**, exécutez dans l'éditeur SQL Supabase les migrations
pas encore appliquées, dans l'ordre :

| Migration | Phase | Ajoute |
|---|---|---|
| `supabase/migrations/0002_enrichissements.sql` | 7 | récurrences, revenus, jours off, habitudes chiffrées, liens avec les objectifs |
| `supabase/migrations/0003_rituels_epargne.sql` | 8 | Top 3 du jour, humeur et énergie, cagnottes d'épargne |
| `supabase/migrations/0004_victoires_semaine.sql` | 9 | victoire du jour, priorités de la semaine |
| `supabase/migrations/0005_menu.sql` | 10 | menu : aliments, repas, objectifs de macros |

Les migrations ne font qu'ajouter : aucune donnée existante n'est modifiée ni supprimée.

## Fonctionnalités en bref

- **Saisie en langage naturel** : « Payer le loyer demain ! #maison tous les mois » (todo),
  « 12,50 resto hier » ou « +2400 salaire » (budget), « Boire 8 verres d'eau » (habitude chiffrée).
- **Palette `⌘K` / `Ctrl+K`** : aller à un onglet, rechercher dans tout, créer depuis ce qu'on tape.
- **Todo** : report en un geste, récurrence, listes/projets, objectif lié.
- **Budget** : projection de fin de mois, variation vs mois précédent, revenus et solde,
  dépenses/revenus récurrents générés automatiquement.
- **Habitudes** : jours précis, jours off (vacances), objectifs chiffrés.
- **Notes** : cases `- [ ]` cochables dans l'aperçu, note du jour.
- **Objectifs** : todos et habitudes liées, prochains jalons sur l'accueil.
- **Top 3 du jour** en tête de l'accueil (suggestions ou saisie directe) ; **rituel du soir**
  (`#/rituel`, proposé à partir de 18 h) : humeur, habitudes, reports, Top 3 de demain.
- **Humeur et énergie** (1 à 5) en un geste sur l'accueil ; **victoire du jour** notée dans le rituel du soir.
- **Planifier la semaine** (`#/semaine`, proposé du vendredi au lundi) : reprendre ce qui traîne,
  choisir 3 priorités, répartir les todos sans date sur les jours.
- **Budget** : catégorie devinée d'après tes dépenses passées (« 45 biocoop » → Courses), dépenses récurrentes depuis la saisie (« ↻ Chaque mois » ou « 900 loyer le 5 tous les mois »),
  **cagnottes d'épargne** (versements, retraits, objectif lié ; l'épargne du mois est déduite du solde).
- **Menu** (`#/menu`) : repas du jour ou prévus (« 200 g poulet midi », « 2 œufs demain matin »),
  macros face à tes objectifs, base d'aliments courants (valeurs indicatives, modifiables) ;
  chaque aliment ajouté propose d'aller dans la liste de courses (liste de todos « Courses »).
- **Revue de la semaine** (`#/revue`, ou la carte de l'accueil le dimanche et le lundi), avec humeur,
  énergie et liens simples (« les jours de sport, énergie +0,8 »).
- **Calendrier** (`#/calendrier`) : vue du mois ; le détail d'un jour permet de cocher, d'ajouter
  une todo à cette date, de noter l'humeur.
- Tout élément créé est modifiable et supprimable, avec « Annuler ».

## Design « Liquid glass »

Panneaux de verre dépoli sur un fond animé three.js (orbe irisé + aurore), thème clair/sombre
(suit le système, bouton de bascule mémorisé). Détails et règles : `UX_GUIDELINES.md`.

- Le fond n'est chargé qu'avec un GPU, au repos du navigateur et hors mode économie de données ;
  sinon un dégradé CSS le remplace. Image fixe si les animations sont réduites ou si l'appareil peine.
- Débogage sans GPU (machine virtuelle) : `localStorage.setItem('cockpit.webgl', 'force')`.

## Raccourcis clavier (desktop)

`⌘K` / `Ctrl+K` palette · `n` ajout rapide (todo, note, dépense) · `/` rechercher dans les notes · `g` puis `a` `o` `n` `h` `t` `b` `m`
pour changer d'onglet, `c` calendrier, `r` revue, `p` planifier la semaine · `?` liste des raccourcis · `Échap` fermer.

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
