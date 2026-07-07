-- =====================================================================
-- Etapa 8 (correção) — Funções para vincular o casal e somar os totais
-- =====================================================================
-- Cole este script inteiro no Supabase SQL Editor e clique em Run.
-- Pode rodar mais de uma vez (é idempotente).
--
-- Por que isso existe:
--   O Row Level Security (RLS) faz cada pessoa só enxergar os PRÓPRIOS
--   dados. Para o casal se vincular e ver os totais somados, precisamos
--   de duas leituras controladas entre usuários. Essas funções usam
--   "security definer" (rodam com privilégio elevado), mas só devolvem
--   dados quando as regras de consentimento batem. Não precisa de
--   nenhuma chave secreta no app.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) link_household(p_partner_code)
--    p_partner_code = o "código" do parceiro, que é o profiles.id (uid).
--    Marca APENAS o próprio share_consent = true e move o próprio
--    household_id para um valor compartilhado determinístico. Nunca
--    força o consentimento do parceiro.
-- ---------------------------------------------------------------------
create or replace function public.link_household(p_partner_code uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller   uuid := auth.uid();
  v_partner  public.profiles;
  v_shared   uuid;
begin
  if v_caller is null then
    raise exception 'Não autenticado';
  end if;

  select * into v_partner
  from public.profiles
  where id = p_partner_code
  limit 1;

  if not found then
    raise exception 'Código do parceiro não encontrado';
  end if;

  if v_partner.id = v_caller then
    raise exception 'Você não pode compartilhar consigo mesmo';
  end if;

  -- household_id compartilhado, igual independente de quem vincula primeiro.
  v_shared := md5(
    least(v_caller::text, v_partner.id::text) ||
    greatest(v_caller::text, v_partner.id::text)
  )::uuid;

  update public.profiles
  set household_id = v_shared,
      share_consent = true
  where id = v_caller;

  insert into public.household_links
    (user_id_initiator, user_id_target, linked_household_id)
  values
    (v_caller, v_partner.id, v_shared);
end;
$$;

grant execute on function public.link_household(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2) get_household_data()
--    Retorna um JSON com os membros que consentiram, os items de todas
--    as semanas deles (já com os dados do alimento) e o total de
--    marmitas. Se o chamador não ativou o compartilhamento, retorna null.
-- ---------------------------------------------------------------------
create or replace function public.get_household_data()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller       uuid := auth.uid();
  v_household    uuid;
  v_consent      boolean;
  v_members      json;
  v_items        json;
  v_total_marm   numeric;
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

  -- Items de todas as semanas desses membros, com os dados do alimento.
  select coalesce(json_agg(json_build_object(
           'food_id', f.id,
           'food_name', f.name,
           'fc', f.fc,
           'kcal_per_100g', f.kcal_per_100g,
           'protein_g_per_100g', f.protein_g_per_100g,
           'carb_g_per_100g', f.carb_g_per_100g,
           'fat_g_per_100g', f.fat_g_per_100g,
           'cooked_grams_per_marmita', wi.cooked_grams_per_marmita,
           'num_marmitas', wi.num_marmitas
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
