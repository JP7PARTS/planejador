-- =====================================================================
-- Etapa 11 — Receitas (recipes) e Ingredientes (recipe_ingredients) + RLS
-- =====================================================================
-- Cole este script inteiro no Supabase SQL Editor e clique em Run.
-- Rode em DEV e em PRODUÇÃO — o app não funciona antes de criar as tabelas.
-- =====================================================================

-- 1) Tabela de receitas/pratos salvos (cada pessoa tem as suas).
create table if not exists public.recipes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  title             text not null,
  steps             text[] not null default '{}',
  total_time_min    integer,
  pressure_time_min integer,
  yield_marmitas    numeric,
  prep_notes        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(user_id, title)
);

comment on table public.recipes is
  'Receitas/pratos reutilizáveis do usuário (ingredientes + modo de preparo).';

-- 2) Ingredientes de cada receita (cada um aponta para um alimento).
create table if not exists public.recipe_ingredients (
  id                       uuid primary key default gen_random_uuid(),
  recipe_id                uuid not null references public.recipes (id) on delete cascade,
  food_id                  uuid not null references public.foods (id) on delete cascade,
  cooked_grams_per_marmita numeric not null,
  created_at               timestamptz not null default now()
);

comment on table public.recipe_ingredients is
  'Ingredientes de cada receita. Segurança herda de recipes via recipe_id.';

-- 3) Row Level Security para recipes: cada pessoa só vê e mexe nas suas.
alter table public.recipes enable row level security;

drop policy if exists "receita_proprio_select" on public.recipes;
create policy "receita_proprio_select"
  on public.recipes for select
  using (auth.uid() = user_id);

drop policy if exists "receita_proprio_insert" on public.recipes;
create policy "receita_proprio_insert"
  on public.recipes for insert
  with check (auth.uid() = user_id);

drop policy if exists "receita_proprio_update" on public.recipes;
create policy "receita_proprio_update"
  on public.recipes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "receita_proprio_delete" on public.recipes;
create policy "receita_proprio_delete"
  on public.recipes for delete
  using (auth.uid() = user_id);

-- 4) RLS para recipe_ingredients: acesso via recipe_id (herda de recipes).
alter table public.recipe_ingredients enable row level security;

drop policy if exists "receita_ing_via_receita" on public.recipe_ingredients;
create policy "receita_ing_via_receita"
  on public.recipe_ingredients for select
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
    )
  );

drop policy if exists "receita_ing_insert_via_receita" on public.recipe_ingredients;
create policy "receita_ing_insert_via_receita"
  on public.recipe_ingredients for insert
  with check (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
    )
  );

drop policy if exists "receita_ing_update_via_receita" on public.recipe_ingredients;
create policy "receita_ing_update_via_receita"
  on public.recipe_ingredients for update
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
    )
  );

drop policy if exists "receita_ing_delete_via_receita" on public.recipe_ingredients;
create policy "receita_ing_delete_via_receita"
  on public.recipe_ingredients for delete
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_ingredients.recipe_id
      and recipes.user_id = auth.uid()
    )
  );
