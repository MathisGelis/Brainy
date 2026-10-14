# PRODUCT.md

## Vision
Un seul endroit, ouvert chaque jour, pour piloter sa vie perso : ce que je vise, ce que je note, ce que je fais régulièrement, ce que je dois faire, ce que je dépense. Zéro friction : si une action prend plus de 5 secondes, c'est raté.

## Principes
1. **Capture instantanée** : ajouter un item = un champ + Entrée.
2. **Un écran = un but** : pas de menus imbriqués, pas de pages de réglages complexes.
3. **Revenir sans réfléchir** : l'app s'ouvre sur « Aujourd'hui » et montre l'essentiel.
4. **Données à moi** : tout est exportable (JSON/CSV).

## Utilisateur
Un seul utilisateur (Mathis). Auth simple (magic link ou email/mot de passe Supabase). Inscription publique désactivée.

## Navigation
Barre latérale (desktop) / barre d'onglets en bas (mobile) :
`Aujourd'hui · Objectifs · Notes · Habitudes · Todo · Budget`

## Specs par onglet

### Aujourd'hui (page d'accueil)
Vue synthèse en lecture + actions rapides :
- Todos du jour (cochables)
- Habitudes du jour (cochables)
- Budget du mois : dépensé / budget, barre de progression
- Un bouton « + » global (raccourci `n`) : ajouter todo, note ou dépense

### Objectifs
- Objectif : titre, description courte, échéance optionnelle, statut (`en cours` / `atteint` / `abandonné`)
- Jalons (sous-étapes cochables) → progression calculée automatiquement (% de jalons faits)
- Regroupement simple par horizon : Court terme (< 3 mois) / Moyen / Long terme (choix à la création)
- Vue liste, cartes avec barre de progression

### Notes
- Liste à gauche, éditeur à droite (mobile : liste puis plein écran)
- Contenu en Markdown, prévisualisation simple
- Épingler, tags optionnels, recherche plein texte instantanée
- Sauvegarde automatique (debounce), pas de bouton « Enregistrer »

### Habitudes
- Habitude : nom, fréquence cible (quotidienne ou X fois / semaine)
- Grille des 7 derniers jours avec cases à cocher en un clic
- Série en cours (streak) et taux de réussite 30 jours
- Heatmap annuelle par habitude (vue détail)
- Archivage plutôt que suppression

### Todo
- Champ d'ajout rapide toujours visible en haut
- Champs optionnels : échéance, priorité (normale/haute), liste/projet
- Filtres : Aujourd'hui · À venir · Toutes · Terminées
- Drag & drop pour réordonner, case à cocher avec annulation (toast « Annuler »)

### Budget (dépenses & budgets)
- Saisie rapide d'une dépense : montant, catégorie (puces), date (défaut aujourd'hui), note optionnelle
- Catégories avec budget mensuel optionnel
- Vue mensuelle : total dépensé, reste, barre par catégorie, navigation mois précédent/suivant
- Liste des dépenses du mois avec édition/suppression
- Dépenses récurrentes : hors périmètre v1 (backlog)
- Revenus : hors périmètre v1 (backlog)

## Hors périmètre v1
Multi-utilisateur, partage, notifications push, import bancaire, application mobile native, IA intégrée.

## Critères de succès
- Ajouter une todo, une dépense ou cocher une habitude en < 5 s
- Lighthouse > 90 en perf et accessibilité
- Utilisable au pouce sur mobile
- Fonctionne sans friction après des semaines sans l'ouvrir
