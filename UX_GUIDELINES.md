# UX_GUIDELINES.md

## Esprit
Minimaliste, calme, rapide. Beaucoup d'espace blanc, peu de couleurs, pas de décoration inutile.

## Design tokens
- Police : Inter (ou system-ui en fallback), 2 graisses max (400 / 600)
- Tailles : 14px corps, 12px secondaire, 20–24px titres de page
- Couleurs : neutres (gris) + **une seule** couleur d'accent ; rouge/vert uniquement pour les états (dépassement budget, succès)
- Rayons : 8px ; ombres quasi inexistantes (bordures 1px à la place)
- Mode clair + sombre (`prefers-color-scheme`), via variables CSS

## Règles d'interaction
1. **Ajout rapide partout** : champ inline, Entrée pour valider, le champ reste focus pour enchaîner.
2. **Pas de modales** sauf confirmation destructrice ; préférer l'édition inline ou un panneau latéral.
3. **Pas de bouton « Enregistrer »** : sauvegarde automatique avec mise à jour optimiste.
4. **Annuler plutôt que confirmer** : suppression/cochage = toast avec « Annuler » (5 s).
5. **Valeurs par défaut intelligentes** : date = aujourd'hui, dernière catégorie utilisée pré-sélectionnée.
6. **Raccourcis clavier** (desktop) : `n` nouveau, `/` recherche, `g` puis `t/n/h/o/b` pour naviguer, `Esc` fermer. Liste affichée avec `?`.
7. **Palette de commandes** (`Cmd/Ctrl+K`) : aller à un onglet, créer un item (v1.1).
8. **États vides utiles** : une phrase + le champ d'ajout, jamais d'écran vide muet.
9. **Feedback immédiat** : pas de spinner bloquant ; skeletons discrets ; erreurs réseau avec « Réessayer ».
10. **Mobile first** : zones tactiles ≥ 44px, actions principales à portée de pouce, tab bar en bas.

## Accessibilité
- Contraste AA minimum, focus visible, navigation clavier complète
- Labels explicites, `aria-live` pour les toasts
- Respect de `prefers-reduced-motion`

## À éviter
Dashboards surchargés, graphiques décoratifs, onboarding, paramètres à rallonge, animations longues, couleurs vives multiples.
