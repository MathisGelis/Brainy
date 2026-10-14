-- 0004 — Victoire du jour, priorités de la semaine (phase 9)
-- Uniquement des ajouts : aucune donnée existante n'est modifiée ni supprimée.

-- VICTOIRE DU JOUR : une ligne, notée dans le rituel du soir (avec l'humeur et l'énergie du jour)
alter table day_checkins add column win text
  check (win is null or char_length(win) between 1 and 280);

-- PRIORITÉS DE LA SEMAINE : lundi de la semaine pour laquelle la todo est une des 3 priorités
alter table todos add column focus_week date
  check (focus_week is null or extract(isodow from focus_week) = 1);
create index todos_focus_week_idx on todos (user_id, focus_week) where focus_week is not null;
