-- 0005 — Menu : aliments, repas et objectifs de macros (phase 10)
-- Uniquement des ajouts : aucune donnée existante n'est modifiée ni supprimée.
-- Valeurs entières : kcal, et dixièmes de gramme pour les macros (comme les centimes pour l'argent).

-- ALIMENTS : valeurs pour 100 g (ou 100 ml), portion facultative (« 1 œuf = 55 g »)
create table foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  kcal integer not null check (kcal between 0 and 950),
  protein_dg integer not null default 0 check (protein_dg between 0 and 1000),
  carbs_dg integer not null default 0 check (carbs_dg between 0 and 1000),
  fat_dg integer not null default 0 check (fat_dg between 0 and 1000),
  portion_g integer check (portion_g is null or portion_g between 1 and 2000),
  portion_label text check (portion_label is null or char_length(portion_label) <= 40),
  created_at timestamptz not null default now()
);
create unique index foods_name_idx on foods (user_id, lower(name));

-- REPAS : un aliment et sa quantité dans un repas d'un jour.
-- Les valeurs sont figées à l'ajout : modifier ou supprimer un aliment ne réécrit pas l'historique.
create table meal_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_id uuid references foods on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  grams integer not null check (grams between 1 and 5000),
  kcal integer not null check (kcal >= 0),
  protein_dg integer not null default 0 check (protein_dg >= 0),
  carbs_dg integer not null default 0 check (carbs_dg >= 0),
  fat_dg integer not null default 0 check (fat_dg >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index meal_items_day_idx on meal_items (user_id, day);

-- OBJECTIFS DE MACROS : une ligne par utilisateur, chaque objectif facultatif
create table macro_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade unique,
  kcal integer check (kcal is null or kcal between 500 and 10000),
  protein_g integer check (protein_g is null or protein_g between 0 and 1000),
  carbs_g integer check (carbs_g is null or carbs_g between 0 and 1000),
  fat_g integer check (fat_g is null or fat_g between 0 and 1000),
  updated_at timestamptz not null default now()
);

-- RLS des nouvelles tables
alter table foods enable row level security;
create policy "own rows" on foods for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table meal_items enable row level security;
create policy "own rows" on meal_items for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table macro_targets enable row level security;
create policy "own rows" on macro_targets for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
