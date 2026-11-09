-- 0009 — Plans de repas, repas mangés, stock à la maison (phase 17)
-- Ajouts uniquement. Seule la nouvelle colonne meal_items.eaten est initialisée pour l'existant
-- (les repas des jours passés et du jour sont considérés comme mangés, comme avant).

-- PLANS : fichiers Markdown importés, gardés tels quels (relus à chaque application)
create table meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  content text not null check (char_length(content) <= 200000),
  created_at timestamptz not null default now()
);

-- PLAN DE CHAQUE SEMAINE : un plan (et son type de semaine A, B… s'il en a) par lundi
create table meal_plan_weeks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  monday date not null check (extract(isodow from monday) = 1),
  plan_id uuid not null references meal_plans on delete cascade,
  week_type text check (week_type ~ '^[A-Z]$'),
  created_at timestamptz not null default now(),
  unique (user_id, monday)
);

-- Repas : plan d'origine (pour remplacer un plan sans toucher aux ajouts à la main) et « mangé »
alter table meal_items add column plan_id uuid references meal_plans on delete set null;
alter table meal_items add column eaten boolean not null default false;
update meal_items set eaten = true where day <= current_date;

-- STOCK À LA MAISON : quantité actuelle par aliment (clé = nom normalisé)
create table pantry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  key text not null check (char_length(key) between 1 and 120),
  name text not null check (char_length(name) between 1 and 120),
  grams integer not null default 0 check (grams >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

alter table meal_plans enable row level security;
create policy "own rows" on meal_plans for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table meal_plan_weeks enable row level security;
create policy "own rows" on meal_plan_weeks for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table pantry enable row level security;
create policy "own rows" on pantry for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
