-- 0002 — Enrichissements (phase 7)
-- Uniquement des ajouts : aucune donnée existante n'est modifiée ni supprimée.

-- TODOS : récurrence et objectif lié
-- recurrence : 'daily' | 'weekly:1,3,5' (jours ISO, 1 = lundi … 7 = dimanche) | 'monthly'
alter table todos add column recurrence text
  check (recurrence is null or recurrence ~ '^(daily|weekly:[1-7](,[1-7]){0,6}|monthly)$');
alter table todos add column goal_id uuid references goals on delete set null;

-- HABITUDES : jours précis, objectif chiffré, objectif lié
-- days : jours ISO planifiés (null = « X fois par semaine » via target_per_week)
alter table habits add column days smallint[]
  check (days is null or (cardinality(days) between 1 and 7 and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]));
alter table habits add column goal_amount integer check (goal_amount is null or goal_amount > 0);
alter table habits add column unit text;
alter table habits add column goal_id uuid references goals on delete set null;
-- amount : quantité du jour pour une habitude chiffrée (null = simple case cochée)
alter table habit_logs add column amount integer check (amount is null or amount > 0);

-- Jours off (vacances, maladie) : ne cassent pas les séries
create table habit_days_off (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  unique (user_id, day)
);

-- OBJECTIFS : date de réalisation des jalons (revue de la semaine)
alter table goal_milestones add column done_at timestamptz;

-- BUDGET : règles récurrentes (dépenses et revenus)
create table recurring_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  kind text not null check (kind in ('expense', 'income')),
  amount_cents integer not null check (amount_cents > 0),
  category_id uuid references expense_categories on delete set null,
  note text,
  day_of_month smallint not null check (day_of_month between 1 and 31),
  start_on date not null default current_date,
  -- dernière occurrence générée : une occurrence supprimée à la main n'est jamais recréée
  last_generated_on date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Revenus
create table incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  received_on date not null default current_date,
  note text,
  recurring_id uuid references recurring_entries on delete set null,
  created_at timestamptz not null default now(),
  -- une seule occurrence par règle et par date (génération idempotente entre appareils)
  unique (recurring_id, received_on)
);
create index incomes_month_idx on incomes (user_id, received_on);

alter table expenses add column recurring_id uuid references recurring_entries on delete set null;
alter table expenses add constraint expenses_recurring_once unique (recurring_id, spent_on);

-- RLS des nouvelles tables
alter table habit_days_off enable row level security;
create policy "own rows" on habit_days_off for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table recurring_entries enable row level security;
create policy "own rows" on recurring_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table incomes enable row level security;
create policy "own rows" on incomes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
