-- 0006 — Recettes et repas types (phase 11)
-- Uniquement des ajouts : aucune donnée existante n'est modifiée ni supprimée.

-- RECETTES : une liste d'ingrédients pour un nombre de parts.
-- Une seule part = un « repas type » (ex. le petit-déjeuner habituel).
create table recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  servings integer not null default 1 check (servings between 1 and 50),
  created_at timestamptz not null default now()
);

-- INGRÉDIENTS : comme un élément de repas, valeurs figées pour la quantité donnée
create table recipe_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  recipe_id uuid not null references recipes on delete cascade,
  food_id uuid references foods on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  grams integer not null check (grams between 1 and 10000),
  kcal integer not null check (kcal >= 0),
  protein_dg integer not null default 0 check (protein_dg >= 0),
  carbs_dg integer not null default 0 check (carbs_dg >= 0),
  fat_dg integer not null default 0 check (fat_dg >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index recipe_items_recipe_idx on recipe_items (recipe_id);

-- Un élément de repas peut venir d'une recette (ses ingrédients servent à la liste de courses)
alter table meal_items add column recipe_id uuid references recipes on delete set null;

-- RLS des nouvelles tables
alter table recipes enable row level security;
create policy "own rows" on recipes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table recipe_items enable row level security;
create policy "own rows" on recipe_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
