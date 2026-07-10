-- =====================================================================
-- Etapa 12 — Vínculo Semana ↔ Receitas (week_recipes) + RLS
-- =====================================================================
-- Cole este script inteiro no Supabase SQL Editor e clique em Run.
-- Rode em DEV e em PRODUÇÃO. Guarda quais receitas foram usadas em cada
-- semana, para reabrir a semana e ainda ver o "Guia de preparo".
-- =====================================================================

create table if not exists public.week_recipes (
  week_id    uuid not null references public.weeks (id) on delete cascade,
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (week_id, recipe_id)
);

comment on table public.week_recipes is
  'Receitas usadas em cada semana (para o guia de preparo). Segurança herda de weeks.';

-- RLS: acesso via week_id (herda de weeks — cada pessoa só vê as suas).
alter table public.week_recipes enable row level security;

drop policy if exists "week_recipe_select_via_week" on public.week_recipes;
create policy "week_recipe_select_via_week"
  on public.week_recipes for select
  using (
    exists (
      select 1 from public.weeks
      where weeks.id = week_recipes.week_id
      and weeks.user_id = auth.uid()
    )
  );

drop policy if exists "week_recipe_insert_via_week" on public.week_recipes;
create policy "week_recipe_insert_via_week"
  on public.week_recipes for insert
  with check (
    exists (
      select 1 from public.weeks
      where weeks.id = week_recipes.week_id
      and weeks.user_id = auth.uid()
    )
  );

drop policy if exists "week_recipe_delete_via_week" on public.week_recipes;
create policy "week_recipe_delete_via_week"
  on public.week_recipes for delete
  using (
    exists (
      select 1 from public.weeks
      where weeks.id = week_recipes.week_id
      and weeks.user_id = auth.uid()
    )
  );
