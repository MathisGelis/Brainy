-- 0003 — Top 3 du jour, humeur et énergie, cagnottes d'épargne (phase 8)
-- Uniquement des ajouts : aucune donnée existante n'est modifiée ni supprimée.

-- TOP 3 DU JOUR : jour pour lequel la todo fait partie des 3 priorités
alter table todos add column focus_on date;
create index todos_focus_idx on todos (user_id, focus_on) where focus_on is not null;

-- HUMEUR ET ÉNERGIE : une saisie par jour (1 à 5), chaque valeur optionnelle
create table day_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null,
  mood smallint check (mood between 1 and 5),
  energy smallint check (energy between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, day)
);

-- CAGNOTTES D'ÉPARGNE
create table savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  target_cents integer not null check (target_cents > 0),
  goal_id uuid references goals on delete set null,
  archived boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Mouvements : versement (> 0) ou retrait (< 0) ; le solde d'une cagnotte est leur somme
create table savings_moves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  savings_id uuid not null references savings_goals on delete cascade,
  amount_cents integer not null check (amount_cents <> 0),
  moved_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
create index savings_moves_month_idx on savings_moves (user_id, moved_on);

-- RLS des nouvelles tables
alter table day_checkins enable row level security;
create policy "own rows" on day_checkins for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table savings_goals enable row level security;
create policy "own rows" on savings_goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table savings_moves enable row level security;
create policy "own rows" on savings_moves for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
