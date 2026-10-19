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

-- RLS : une politique par table, accès limité aux lignes de l'utilisateur
alter table goals enable row level security;
create policy "own rows" on goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table goal_milestones enable row level security;
create policy "own rows" on goal_milestones for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table notes enable row level security;
create policy "own rows" on notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table habits enable row level security;
create policy "own rows" on habits for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table habit_logs enable row level security;
create policy "own rows" on habit_logs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table todo_lists enable row level security;
create policy "own rows" on todo_lists for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table todos enable row level security;
create policy "own rows" on todos for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table expense_categories enable row level security;
create policy "own rows" on expense_categories for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table expenses enable row level security;
create policy "own rows" on expenses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Fonction pour fixer search_path (bonne pratique Supabase)
alter function set_updated_at() set search_path = '';
