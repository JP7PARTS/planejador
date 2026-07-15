-- =====================================================================
-- Compartilhar receita por link: get_shared_recipe(uuid)
-- =====================================================================
-- Receitas são privadas por RLS (só o dono lê). Para o amigo importar uma
-- receita compartilhada, este RPC "security definer" devolve a receita por id
-- com os alimentos DESNORMALIZADOS (nutrição junto), para o importador
-- recriar/casar os alimentos na conta dele. O "código" é o próprio UUID da
-- receita (não enumerável). Idempotente — pode rodar mais de uma vez.
-- =====================================================================

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
    ), '[]'::jsonb)
  )
  into v_result
  from public.recipes r
  left join public.profiles p on p.id = r.user_id
  where r.id = p_recipe_id;

  return v_result; -- null quando a receita não existe
end;
$$;

grant execute on function public.get_shared_recipe(uuid) to authenticated;
