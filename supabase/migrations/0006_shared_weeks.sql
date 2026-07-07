-- =====================================================================
-- Etapa 10 — Semana conjunta (dividir uma semana entre duas pessoas)
-- =====================================================================
-- Cole este script inteiro no Supabase SQL Editor e clique em Run.
-- Pode rodar mais de uma vez (é idempotente).
--
-- O que faz:
--   Permite marcar uma semana como "conjunta" (dividida entre você e
--   outra pessoa, ex.: sua namorada) e dizer, por alimento, de quem é
--   cada item. Semanas antigas ficam is_shared=false e person=1, ou
--   seja, continuam funcionando exatamente como antes.
-- =====================================================================

-- 1) Semana: marca se é conjunta, nome da 2ª pessoa e marmitas dela.
alter table public.weeks
  add column if not exists is_shared      boolean not null default false;

alter table public.weeks
  add column if not exists person2_name   text;

alter table public.weeks
  add column if not exists num_marmitas_p2 numeric not null default 0;

-- 2) Item da semana: de quem é (1 = você, 2 = a 2ª pessoa).
alter table public.week_items
  add column if not exists person smallint not null default 1;

-- Garante que person só pode ser 1 ou 2.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'week_items_person_check'
  ) then
    alter table public.week_items
      add constraint week_items_person_check check (person in (1, 2));
  end if;
end $$;
