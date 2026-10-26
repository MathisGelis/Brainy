-- 0008 — Plan financier pluriannuel (phase 14)
-- Uniquement des ajouts : aucune donnée existante n'est modifiée ni supprimée.
-- Le « prévu » vient du plan (importé d'un classeur Excel puis modifiable) ; le « réel » est
-- calculé depuis les revenus, dépenses et cagnottes de l'app, jamais saisi deux fois.

-- RÉGLAGES : une ligne par utilisateur (taux de conversion pour les totaux toutes devises)
create table plan_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users on delete cascade,
  -- 1 € = eur_to_cad_milli / 1000 CAD (ex. 1500 = 1,5)
  eur_to_cad_milli integer not null default 1500 check (eur_to_cad_milli between 100 and 10000)
);

-- PÉRIODES : une année, ou une partie d'année (ex. « 2028 France (Jan-Avr) »), dans une devise
create table plan_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  -- premier jour du premier et du dernier mois
  start_month date not null check (extract(day from start_month) = 1),
  end_month date not null check (extract(day from end_month) = 1),
  currency text not null default 'EUR' check (currency in ('EUR', 'CAD')),
  -- épargne visée sur la période (projection), en centimes
  savings_target_cents integer,
  age_label text check (char_length(age_label) <= 40),
  -- contexte de la période et journal (texte libre)
  notes text check (char_length(notes) <= 10000),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (end_month >= start_month)
);

-- POSTES : revenu ou dépense prévu chaque mois, éventuellement sur une partie de la période
create table plan_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  period_id uuid not null references plan_periods on delete cascade,
  kind text not null check (kind in ('income', 'expense')),
  label text not null check (char_length(label) between 1 and 120),
  monthly_cents integer not null check (monthly_cents >= 0),
  -- mois actifs (premiers jours de mois) ; null = toute la période
  first_month date,
  last_month date,
  -- catégorie de dépenses de l'app qui donne le réel de ce poste
  category_id uuid references expense_categories on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (first_month is null or last_month is null or last_month >= first_month)
);
create index plan_lines_period_idx on plan_lines (period_id);

-- PRIMES ET EXCEPTIONNELS : montant prévu (négatif pour un frais), reçu ou non
create table plan_bonuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  period_id uuid not null references plan_periods on delete cascade,
  label text not null check (char_length(label) between 1 and 120),
  planned_cents integer not null default 0,
  -- mois attendu quand il est précis, sinon le libellé d'origine (« Mi-année »)
  expected_month date,
  expected_label text check (char_length(expected_label) <= 40),
  received_cents integer,
  received_on date,
  -- revenu créé dans l'app quand la prime est marquée reçue
  income_id uuid references incomes on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index plan_bonuses_period_idx on plan_bonuses (period_id);

-- ENVELOPPES : Livret A, CELI…, reliées si possible à une cagnotte (qui donne le solde réel)
create table plan_envelopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  currency text not null default 'EUR' check (currency in ('EUR', 'CAD')),
  savings_id uuid references savings_goals on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Solde visé par enveloppe en fin de période
create table plan_envelope_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  envelope_id uuid not null references plan_envelopes on delete cascade,
  period_id uuid not null references plan_periods on delete cascade,
  target_cents integer not null check (target_cents >= 0),
  unique (envelope_id, period_id)
);

-- RLS
alter table plan_settings enable row level security;
create policy "own rows" on plan_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table plan_periods enable row level security;
create policy "own rows" on plan_periods for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table plan_lines enable row level security;
create policy "own rows" on plan_lines for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table plan_bonuses enable row level security;
create policy "own rows" on plan_bonuses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table plan_envelopes enable row level security;
create policy "own rows" on plan_envelopes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table plan_envelope_targets enable row level security;
create policy "own rows" on plan_envelope_targets for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
