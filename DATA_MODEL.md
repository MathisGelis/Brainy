# DATA_MODEL.md

Postgres (Supabase). Toutes les tables portent `user_id` et sont protégées par RLS.
Montants en centimes (`integer`). Migration initiale à placer dans `supabase/migrations/0001_init.sql`.

```sql
-- Helpers
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

-- OBJECTIFS
create table goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null,
  description text,
  horizon text not null default 'short' check (horizon in ('short','medium','long')),
  target_date date,
  status text not null default 'active' check (status in ('active','achieved','abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table goal_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  goal_id uuid not null references goals on delete cascade,
  title text not null,
  done boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- NOTES
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null default '',
  content text not null default '',
  pinned boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_search_idx on notes
  using gin (to_tsvector('french', title || ' ' || content));

-- HABITUDES
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  target_per_week smallint not null default 7 check (target_per_week between 1 and 7),
  archived boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  habit_id uuid not null references habits on delete cascade,
  day date not null,
  unique (habit_id, day)
);

-- TODOS
create table todo_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  position integer not null default 0
);

create table todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  list_id uuid references todo_lists on delete set null,
  title text not null,
  done boolean not null default false,
  done_at timestamptz,
  due_date date,
  priority text not null default 'normal' check (priority in ('normal','high')),
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- BUDGET
create table expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  color text,
  monthly_budget_cents integer check (monthly_budget_cents >= 0),
  position integer not null default 0,
  archived boolean not null default false
);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  category_id uuid references expense_categories on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  spent_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index expenses_month_idx on expenses (user_id, spent_on);

-- Triggers updated_at
create trigger goals_updated before update on goals for each row execute function set_updated_at();
create trigger notes_updated before update on notes for each row execute function set_updated_at();

-- RLS (à répéter pour chaque table)
alter table goals enable row level security;
create policy "own rows" on goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- idem : goal_milestones, notes, habits, habit_logs, todo_lists, todos,
--        expense_categories, expenses
```

## Évolutions (migrations suivantes, uniquement des ajouts)
- `0002_enrichissements.sql` (phase 7) : récurrence et objectif lié sur `todos` ; jours précis, objectif chiffré et objectif lié sur `habits` (`habit_logs.amount`) ; `habit_days_off` ; `goal_milestones.done_at` ; `recurring_entries` (dépenses et revenus mensuels), `incomes`, `expenses.recurring_id` (une occurrence par règle et par date).
- `0003_rituels_epargne.sql` (phase 8) : `todos.focus_on` (jour où la todo fait partie du Top 3) ; `day_checkins` (humeur et énergie 1–5, une saisie par jour) ; `savings_goals` (cagnotte : nom, cible, objectif lié, archivage) et `savings_moves` (versement > 0, retrait < 0 ; le solde est leur somme, l'épargne nette du mois est déduite du solde du budget).
- `0004_victoires_semaine.sql` (phase 9) : `day_checkins.win` (victoire du jour, 280 caractères max) ; `todos.focus_week` (lundi de la semaine pour laquelle la todo est une des 3 priorités).
- `0005_menu.sql` (phase 10) : `foods` (valeurs pour 100 g : kcal entières, macros en dixièmes de gramme, portion facultative) ; `meal_items` (aliment et quantité d'un repas d'un jour, valeurs figées à l'ajout) ; `macro_targets` (objectifs du jour, une ligne par utilisateur). La liste de courses réutilise une liste de todos « Courses ».
- `0006_recettes.sql` (phase 11) : `recipes` (nom, nombre de parts ; 1 part = repas type) ; `recipe_items` (ingrédients, valeurs figées comme `meal_items`) ; `meal_items.recipe_id` (un élément de repas issu d'une recette, pour retrouver ses ingrédients).

## Notes de modélisation
- La progression d'un objectif est **calculée** (jalons faits / total), pas stockée.
- Streak et taux de réussite des habitudes sont calculés côté client à partir de `habit_logs`.
- Le budget restant d'un mois = somme des `monthly_budget_cents` − somme des dépenses du mois ; calcul via requête agrégée ou vue SQL `monthly_spending`.
- Une catégorie supprimée met `category_id` à `null` (les dépenses restent) ; préférer l'archivage.
- Seed initial suggéré de catégories : Courses, Restaurants, Transport, Logement, Loisirs, Santé, Abonnements, Autre.
