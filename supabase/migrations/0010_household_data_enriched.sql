-- =====================================================================
-- Etapa 18 — Totais do Casal por período (data + junto e separado)
-- =====================================================================
-- Cole este script inteiro no Supabase SQL Editor e clique em Run.
-- Pode rodar mais de uma vez (é idempotente).
--
-- Por que existe:
--   A tela "Totais do Casal" somava TODAS as semanas dos dois numa lista
--   única e confusa. Agora ela filtra por período (data) e mostra o total
--   combinado (agrupado por categoria) + a divisão por pessoa. Para isso a
--   função precisa devolver, por item: a categoria do alimento, quem é o
--   dono da semana, e a data/identidade da semana (para deduplicar as
--   marmitas e filtrar por período no app).
--
--   Só o CORPO da função muda (mesmas regras de consentimento / security
--   definer). Nenhuma mudança de RLS.
-- =====================================================================

create or replace function public.get_household_data()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller     uuid := auth.uid();
  v_household  uuid;
  v_consent    boolean;
  v_members    json;
  v_items      json;
  v_total_marm numeric;
begin
  if v_caller is null then
    raise exception 'Não autenticado';
  end if;

  select household_id, share_consent
  into v_household, v_consent
  from public.profiles
  where id = v_caller;

  if v_consent is not true then
    return null;
  end if;

  -- Membros do casal (só quem consentiu e está no mesmo household).
  select coalesce(json_agg(json_build_object(
           'id', p.id,
           'name', p.display_name
         )), '[]'::json)
  into v_members
  from public.profiles p
  where p.household_id = v_household
    and p.share_consent = true;

  -- Items de todas as semanas desses membros, já enriquecidos com categoria,
  -- dono e identidade/data da semana (para filtrar por período no app).
  select coalesce(json_agg(json_build_object(
           'food_id', f.id,
           'food_name', f.name,
           'category', f.category,
           'fc', f.fc,
           'kcal_per_100g', f.kcal_per_100g,
           'protein_g_per_100g', f.protein_g_per_100g,
           'carb_g_per_100g', f.carb_g_per_100g,
           'fat_g_per_100g', f.fat_g_per_100g,
           'cooked_grams_per_marmita', wi.cooked_grams_per_marmita,
           'num_marmitas', wi.num_marmitas,
           'owner_id', w.user_id,
           'week_id', w.id,
           'week_num_marmitas', w.num_marmitas,
           'week_created_at', w.created_at
         )), '[]'::json)
  into v_items
  from public.week_items wi
  join public.weeks w on w.id = wi.week_id
  join public.foods f on f.id = wi.food_id
  where w.user_id in (
    select p.id from public.profiles p
    where p.household_id = v_household
      and p.share_consent = true
  );

  -- Total de marmitas: soma de weeks.num_marmitas (uma vez por semana).
  -- (O app recalcula por período; mantido aqui por compatibilidade.)
  select coalesce(sum(w.num_marmitas), 0)
  into v_total_marm
  from public.weeks w
  where w.user_id in (
    select p.id from public.profiles p
    where p.household_id = v_household
      and p.share_consent = true
  );

  return json_build_object(
    'members', v_members,
    'items', v_items,
    'total_marmitas', v_total_marm
  );
end;
$$;

grant execute on function public.get_household_data() to authenticated;
