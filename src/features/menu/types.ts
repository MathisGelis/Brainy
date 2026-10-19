/** Aliment : valeurs pour 100 g (ou 100 ml). kcal entières, macros en dixièmes de gramme. */
export type Food = {
  id: string
  name: string
  kcal: number
  protein_dg: number
  carbs_dg: number
  fat_dg: number
  /** Poids d'une portion (« 1 œuf » = 55 g), pour saisir « 2 œufs » */
  portion_g: number | null
  portion_label: string | null
  created_at: string
}

export type FoodPatch = Partial<Omit<Food, 'id' | 'created_at'>>

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack'

/** Un aliment dans un repas ; valeurs figées pour la quantité au moment de l'ajout. */
export type MealItem = {
  id: string
  day: string
  meal: Meal
  food_id: string | null
  name: string
  grams: number
  kcal: number
  protein_dg: number
  carbs_dg: number
  fat_dg: number
  /** Recette d'origine (ses ingrédients servent à la liste de courses) */
  recipe_id: string | null
  position: number
  created_at: string
}

export type MealItemPatch = Partial<
  Pick<MealItem, 'meal' | 'day' | 'grams' | 'kcal' | 'protein_dg' | 'carbs_dg' | 'fat_dg'>
>

/** Objectifs du jour (null : pas d'objectif). */
export type MacroTargets = {
  kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
}

/** Totaux : kcal et macros en dixièmes de gramme. */
export type Macros = { kcal: number; protein_dg: number; carbs_dg: number; fat_dg: number }

/** Recette (ou repas type quand elle fait une seule part). */
export type Recipe = {
  id: string
  name: string
  servings: number
  created_at: string
}

export type RecipePatch = Partial<Pick<Recipe, 'name' | 'servings'>>

/** Ingrédient d'une recette : valeurs figées pour la quantité donnée, comme un élément de repas. */
export type RecipeItem = {
  id: string
  recipe_id: string
  food_id: string | null
  name: string
  grams: number
  kcal: number
  protein_dg: number
  carbs_dg: number
  fat_dg: number
  position: number
  created_at: string
}

export type RecipeItemPatch = Partial<
  Pick<RecipeItem, 'grams' | 'kcal' | 'protein_dg' | 'carbs_dg' | 'fat_dg'>
>

/** Recette avec ses ingrédients (tels qu'en cache). */
export type RecipeFull = Recipe & { items: RecipeItem[] }
