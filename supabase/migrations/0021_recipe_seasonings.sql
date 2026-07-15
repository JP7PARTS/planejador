-- Temperos & aromáticos da receita (cebola, alho, tomate, sal...): baixo volume,
-- "a gosto". NÃO entram em nutrição nem no cálculo de gramas — são referência de
-- compra. quantity nula = "a gosto".
create table if not exists public.recipe_seasonings (
  id          uuid primary key default gen_random_uuid(),
  recipe_id   uuid not null references public.recipes (id) on delete cascade,
  name        text not null,
  quantity    numeric,
  order_index int,
  created_at  timestamptz not null default now()
);

comment on table public.recipe_seasonings is
  'Temperos/aromáticos de cada receita (referência de compra, fora do cálculo).';

-- RLS: acesso via recipe_id (herda de recipes), espelhando recipe_ingredients.
alter table public.recipe_seasonings enable row level security;

drop policy if exists "receita_temp_select_via_receita" on public.recipe_seasonings;
create policy "receita_temp_select_via_receita"
  on public.recipe_seasonings for select
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_seasonings.recipe_id
      and recipes.user_id = auth.uid()
    )
  );

drop policy if exists "receita_temp_insert_via_receita" on public.recipe_seasonings;
create policy "receita_temp_insert_via_receita"
  on public.recipe_seasonings for insert
  with check (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_seasonings.recipe_id
      and recipes.user_id = auth.uid()
    )
  );

drop policy if exists "receita_temp_update_via_receita" on public.recipe_seasonings;
create policy "receita_temp_update_via_receita"
  on public.recipe_seasonings for update
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_seasonings.recipe_id
      and recipes.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_seasonings.recipe_id
      and recipes.user_id = auth.uid()
    )
  );

drop policy if exists "receita_temp_delete_via_receita" on public.recipe_seasonings;
create policy "receita_temp_delete_via_receita"
  on public.recipe_seasonings for delete
  using (
    exists (
      select 1 from public.recipes
      where recipes.id = recipe_seasonings.recipe_id
      and recipes.user_id = auth.uid()
    )
  );

-- Atualiza o RPC de compartilhar receita para incluir os temperos (para a
-- importação recriar). Substitui a definição de 0020.
create or replace function public.get_shared_recipe(p_recipe_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'title', r.title,
    'steps', r.steps,
    'total_time_min', r.total_time_min,
    'pressure_time_min', r.pressure_time_min,
    'yield_marmitas', r.yield_marmitas,
    'prep_notes', r.prep_notes,
    'owner_name', coalesce(nullif(p.display_name, ''), 'Alguém'),
    'ingredients', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'cooked_grams_per_marmita', ri.cooked_grams_per_marmita,
          'choice_group', ri.choice_group,
          'choice_label', ri.choice_label,
          'is_principal', ri.is_principal,
          'food', jsonb_build_object(
            'name', f.name,
            'category', f.category,
            'fc', f.fc,
            'kcal_per_100g', f.kcal_per_100g,
            'protein_g_per_100g', f.protein_g_per_100g,
            'carb_g_per_100g', f.carb_g_per_100g,
            'fat_g_per_100g', f.fat_g_per_100g
          )
        )
        order by ri.choice_group nulls first, ri.id
      )
      from public.recipe_ingredients ri
      join public.foods f on f.id = ri.food_id
      where ri.recipe_id = r.id
    ), '[]'::jsonb),
    'seasonings', coalesce((
      select jsonb_agg(
        jsonb_build_object('name', rs.name, 'quantity', rs.quantity)
        order by rs.order_index nulls last, rs.id
      )
      from public.recipe_seasonings rs
      where rs.recipe_id = r.id
    ), '[]'::jsonb)
  )
  into v_result
  from public.recipes r
  left join public.profiles p on p.id = r.user_id
  where r.id = p_recipe_id;

  return v_result;
end;
$$;

grant execute on function public.get_shared_recipe(uuid) to authenticated;
