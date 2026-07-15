-- =====================================================================
-- Etapa 23 — get_household_week devolve o nome de compra (shopping_name)
-- =====================================================================
-- Cole este script inteiro no Supabase SQL Editor e clique em Run.
-- Idempotente (create or replace). Rodar em dev E produção.
--
-- Por que existe:
--   A semana compartilhada (ver/[id]) monta os alimentos a partir desta função.
--   Para juntar "Acém cozido"/"Acém grelhado" pelo nome de compra também na
--   visão do casal, a função precisa devolver f.shopping_name em cada item.
--   (Requer a coluna foods.shopping_name — migration 0022.)
-- =====================================================================

create or replace function public.get_household_week(p_week_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller     uuid := auth.uid();
  v_household  uuid;
  v_consent    boolean;
  v_week       public.weeks;
  v_visivel    boolean := false;
  v_owner_name text;
  v_items      json;
begin
  if v_caller is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_week from public.weeks where id = p_week_id;
  if not found then
    return null;
  end if;

  -- Perfil de quem está abrindo (para checar household + consentimento).
  select household_id, share_consent
  into v_household, v_consent
  from public.profiles
  where id = v_caller;

  -- Visível se é a própria semana OU semana do casal (mesmo household + consent).
  if v_week.user_id = v_caller then
    v_visivel := true;
  elsif v_week.is_shared
    and v_week.household_id is not null
    and v_week.household_id = v_household
    and v_consent = true then
    v_visivel := true;
  end if;

  if not v_visivel then
    return null;
  end if;

  -- Nome do dono da semana.
  select display_name into v_owner_name
  from public.profiles where id = v_week.user_id;

  -- Itens com os dados do alimento (da conta do dono) + se já existe na minha.
  select coalesce(json_agg(json_build_object(
           'food_id', f.id,
           'food_name', f.name,
           'shopping_name', f.shopping_name,
           'category', f.category,
           'kcal_per_100g', f.kcal_per_100g,
           'protein_g_per_100g', f.protein_g_per_100g,
           'carb_g_per_100g', f.carb_g_per_100g,
           'fat_g_per_100g', f.fat_g_per_100g,
           'fc', f.fc,
           'cooked_grams_per_marmita', wi.cooked_grams_per_marmita,
           'num_marmitas', wi.num_marmitas,
           'person', wi.person,
           'already_in_my_db', exists (
             select 1 from public.foods mf
             where mf.user_id = v_caller and mf.name = f.name
           )
         ) order by wi.created_at), '[]'::json)
  into v_items
  from public.week_items wi
  join public.foods f on f.id = wi.food_id
  where wi.week_id = p_week_id;

  return json_build_object(
    'week', json_build_object(
      'id', v_week.id,
      'title', v_week.title,
      'notes', v_week.notes,
      'num_marmitas', v_week.num_marmitas,
      'num_marmitas_p2', v_week.num_marmitas_p2,
      'is_shared', v_week.is_shared,
      'person2_name', v_week.person2_name,
      'user_id', v_week.user_id
    ),
    'owner_name', coalesce(v_owner_name, 'Parceira'),
    'items', v_items
  );
end;
$$;

grant execute on function public.get_household_week(uuid) to authenticated;
