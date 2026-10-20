-- 0007 — Événements du calendrier (phase 13)
-- Uniquement des ajouts : aucune donnée existante n'est modifiée ni supprimée.

-- ÉVÉNEMENTS : un ou plusieurs jours (déplacement, vacances, rendez-vous), heure facultative,
-- récurrence facultative. Les occurrences sont calculées côté client, jamais stockées.
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  -- Premier et dernier jour (identiques pour un événement d'un jour)
  start_on date not null,
  end_on date not null,
  -- Heures facultatives (heure de Paris) ; sans heure = toute la journée
  start_time time,
  end_time time,
  note text check (char_length(note) <= 2000),
  -- Récurrence : tous les N jours / semaines / mois / ans
  repeat text check (repeat in ('daily', 'weekly', 'monthly', 'yearly')),
  repeat_every smallint not null default 1 check (repeat_every between 1 and 99),
  -- Jours ISO (1 = lundi … 7 = dimanche) d'une récurrence hebdomadaire ; null = jour de start_on
  repeat_days smallint[] check (repeat_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]),
  -- Dernier jour où une occurrence peut commencer ; null = sans fin
  repeat_until date,
  -- Occurrences supprimées une à une (leur premier jour)
  skipped date[] not null default '{}',
  created_at timestamptz not null default now(),
  check (end_on >= start_on and end_on - start_on <= 366),
  check (end_time is null or start_time is not null),
  check (end_on > start_on or end_time is null or end_time >= start_time),
  check (repeat_until is null or repeat_until >= start_on)
);
create index events_user_start_idx on events (user_id, start_on);

alter table events enable row level security;
create policy "own rows" on events for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
