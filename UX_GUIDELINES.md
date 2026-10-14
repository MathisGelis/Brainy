# UX_GUIDELINES.md

## Esprit
Minimaliste, calme, rapide. Direction visuelle **« Liquid glass »** (à la Apple) : l'interface est faite de panneaux de verre dépoli qui flottent au-dessus d'un fond vivant mais lent. Le contenu reste roi ; le décor ne doit jamais gêner la lecture ni ralentir une action.

## Design tokens
- Police : système Apple (`-apple-system`, SF Pro) puis Inter / system-ui, 2 graisses max (400 / 600)
- Tailles : 14px corps, 12px secondaire, grands titres de page 28px (mobile) / 34px (desktop)
- Couleurs : neutres + **une seule** couleur d'accent (indigo) ; rouge/vert uniquement pour les états (dépassement budget, succès)
- Matières (utilitaires CSS dans `src/index.css`) :
  - `glass` / `glass-strong` : verre flottant (flou + saturation, reflet diagonal, liseré lumineux en haut) pour la navigation, le bouton « + », les toasts, l'ajout rapide
  - `sheet` : feuille de verre plus opaque qui porte le contenu d'une page (garantit le contraste AA quel que soit le fond)
  - `card`, `field`, `pill`, `btn-primary`, `.check` : cartes, champs, capsules sélectionnables (`aria-pressed`), bouton principal, cases rondes
- Rayons : 12px champs, 18px cartes, 28–32px panneaux, capsules pour boutons et filtres
- Thème clair + sombre : suit le système par défaut, bascule manuelle mémorisée (`data-theme` sur `<html>`)

## Fond animé (three.js)
- Un orbe irisé « liquide » et une goutte satellite sur une aurore douce ; une petite onde quand on accomplit quelque chose (todo, habitude, jalon, objectif atteint)
- Chargé **après** l'affichage, au repos du navigateur ; jamais chargé sans WebGL ni en mode économie de données ; image fixe si `prefers-reduced-motion`
- Basse définition, ~40 i/s, en pause onglet masqué ; repli statique en CSS (`body::before`)
- Purement décoratif (`aria-hidden`) : aucune information ne doit en dépendre

## Règles d'interaction
1. **Ajout rapide partout** : champ inline, Entrée pour valider, le champ reste focus pour enchaîner. Saisie en langage naturel (« Payer le loyer demain ! #maison », « 12,50 resto hier ») avec aperçu de ce qui est compris.
2. **Pas de modales** sauf confirmation destructrice ; préférer l'édition inline ou un panneau latéral.
3. **Pas de bouton « Enregistrer »** : sauvegarde automatique avec mise à jour optimiste.
4. **Annuler plutôt que confirmer** : suppression/cochage = toast avec « Annuler » (5 s). Tout élément créé est modifiable et supprimable ; une annulation qui enchaîne plusieurs écritures (ex. recréer une liste puis y rattacher ses todos) les fait dans une seule requête, pour aboutir même si l'écran change.
5. **Valeurs par défaut intelligentes** : date = aujourd'hui, dernière catégorie utilisée pré-sélectionnée.
6. **Raccourcis clavier** (desktop) : `n` nouveau, `/` recherche, `g` puis `a/o/n/h/t/b` pour naviguer (`c` calendrier, `r` revue), `Esc` fermer. Liste affichée avec `?`.
7. **Palette de commandes** (`Cmd/Ctrl+K`) : aller à un onglet, rechercher dans tout, créer depuis la saisie.
8. **États vides utiles** : une phrase + le champ d'ajout, jamais d'écran vide muet.
9. **Feedback immédiat** : pas de spinner bloquant ; skeletons discrets ; erreurs réseau avec « Réessayer ».
10. **Mobile first** : zones tactiles ≥ 44px, actions principales à portée de pouce, tab bar en bas.

## Accessibilité
- Contraste AA minimum, focus visible, navigation clavier complète
- Labels explicites, `aria-live` pour les toasts
- Respect de `prefers-reduced-motion` (fond figé, transitions coupées)
- Texte toujours sur `sheet` ou `glass-strong` : jamais directement sur le fond animé

## À éviter
Dashboards surchargés, graphiques décoratifs (le fond animé est la seule exception assumée), onboarding, paramètres à rallonge, animations longues ou rapides au premier plan, couleurs vives multiples dans l'interface.
