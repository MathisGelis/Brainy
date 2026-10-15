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
`Aujourd'hui · Objectifs · Notes · Habitudes · Todo · Budget · Menu`

## Specs par onglet

### Aujourd'hui (page d'accueil)
Vue synthèse en lecture + actions rapides :
- Top 3 du jour : les 3 priorités choisies le matin (ou la veille au soir), en tête de page
- Rituel du matin (choisir le Top 3) et du soir (humeur, victoire du jour, habitudes, reports, Top 3 de demain), en 30 secondes
- Priorités de la semaine (3 todos) rappelées sous le Top 3
- Humeur et énergie du jour (1 à 5) en un geste
- Todos du jour (cochables, report en un geste)
- Habitudes du jour (cochables ; quantité pour les habitudes chiffrées)
- Prochain jalon de chaque objectif en cours (cochable)
- Budget du mois : dépensé / budget, barre de progression
- Menu du jour : kcal restantes et prochain repas prévu
- Note du jour (journal) en un clic
- Le dimanche : accès à la revue de la semaine ; du vendredi au lundi : planification de la semaine
- Un bouton « + » global (raccourci `n`) : ajouter todo, note ou dépense

### Objectifs
- Objectif : titre, description courte, échéance optionnelle, statut (`en cours` / `atteint` / `abandonné`)
- Jalons (sous-étapes cochables) → progression calculée automatiquement (% de jalons faits)
- Regroupement simple par horizon : Court terme (< 3 mois) / Moyen / Long terme (choix à la création)
- Vue liste, cartes avec barre de progression
- Todos et habitudes peuvent être liées à un objectif : les todos liées comptent dans la progression, les habitudes liées affichent leur taux

### Notes
- Liste à gauche, éditeur à droite (mobile : liste puis plein écran)
- Contenu en Markdown, prévisualisation simple
- Épingler, tags optionnels, recherche plein texte instantanée
- Listes à cocher Markdown (`- [ ]`) cochables directement dans l'aperçu
- Sauvegarde automatique (debounce), pas de bouton « Enregistrer »

### Habitudes
- Habitude : nom, fréquence (tous les jours, X fois / semaine, ou jours précis), objectif chiffré optionnel (ex. 8 verres, 20 min)
- Jours off (vacances, maladie) : ne cassent pas les séries et ne comptent pas dans le taux
- Grille des 7 derniers jours avec cases à cocher en un clic
- Série en cours (streak) et taux de réussite 30 jours
- Heatmap annuelle par habitude (vue détail)
- Archivage (réversible) ou suppression avec « Annuler »

### Todo
- Champ d'ajout rapide toujours visible en haut, en langage naturel : « Payer le loyer demain ! #maison tous les mois »
- Champs optionnels : échéance, priorité (normale/haute), liste/projet, récurrence (quotidienne, jours de la semaine, mensuelle), objectif lié
- Report en un geste (Demain, Lundi) pour les todos du jour ou en retard
- Filtres : Aujourd'hui · À venir · Toutes · Terminées
- Drag & drop pour réordonner, case à cocher avec annulation (toast « Annuler »)

### Budget (dépenses & budgets)
- Saisie rapide d'une dépense : montant, catégorie (puces), date (défaut aujourd'hui), note optionnelle ; en langage naturel : « 12,50 resto hier »
- Catégorie devinée d'après l'historique (« 45 carrefour » → Courses si c'est l'habitude) ; un choix manuel prime toujours
- Catégories avec budget mensuel optionnel
- Vue mensuelle : total dépensé, reste, barre par catégorie, navigation mois précédent/suivant
- Rythme : projection de fin de mois et variation par catégorie par rapport au mois précédent
- Revenus du mois et solde (revenus − dépenses)
- Récurrences (loyer, abonnements, salaire) : générées automatiquement chaque mois, modifiables et supprimables ; créées directement depuis la saisie (« ↻ Chaque mois » ou « 900 loyer le 5 tous les mois »)
- Cagnottes d'épargne : cible, versements et retraits, objectif lié ; l'épargne du mois est déduite du solde
- Liste des dépenses et revenus du mois avec édition/suppression

### Menu (repas et macros)
- Repas du jour (petit-déjeuner, déjeuner, dîner, collation) : passés = ce qui a été mangé, à venir = menu prévu
- Ajout en langage naturel : « 200 g poulet midi », « 2 œufs », « 1 banane collation demain »
- Base d'aliments courants (valeurs indicatives pour 100 g) ; chaque aliment est copié dans « Mes aliments » et devient modifiable ; aliment inconnu : on saisit ses valeurs une fois
- Tracker de macros : kcal, protéines, glucides, lipides du jour face aux objectifs ; kcal par jour de la semaine
- Liste de courses (liste de todos « Courses ») : quand on ajoute un aliment au menu, proposition de l'y ajouter ; « tout ajouter » pour les aliments de la semaine, sans doublon
- Recettes et repas types : ingrédients et nombre de parts, macros par part ; ajout au menu en un geste (« 2 parts curry ») ; « enregistrer ce repas comme repas type » ; leurs ingrédients vont dans la liste de courses
- Copier le menu d'un jour récent ou dupliquer la semaine précédente
- Courses terminées : « Combien as-tu payé ? » crée la dépense dans Budget (catégorie Courses)
- Repas, aliments, recettes et objectifs modifiables et supprimables

### Transverse
- Palette de commandes `Cmd/Ctrl+K` : aller à un onglet, créer, rechercher dans tout
- Revue de la semaine : priorités tenues, todos faites, habitudes, dépenses, jalons atteints, victoires, humeur et énergie (avec liens simples : « les jours de sport, énergie +0,8 »)
- Planification de la semaine (rituel du dimanche) : reprendre ce qui traîne, choisir 3 priorités, répartir les todos sans date sur les jours
- Calendrier : vue du mois (échéances, habitudes, dépenses, jalons, humeur) ; le détail d'un jour est actionnable
- Tout élément créé est modifiable et supprimable (avec « Annuler » quand c'est possible)

## Hors périmètre v1
Multi-utilisateur, partage, notifications push, import bancaire, application mobile native, IA intégrée.

## Critères de succès
- Ajouter une todo, une dépense ou cocher une habitude en < 5 s
- Lighthouse > 90 en perf et accessibilité
- Utilisable au pouce sur mobile
- Fonctionne sans friction après des semaines sans l'ouvrir
