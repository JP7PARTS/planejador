-- =====================================================================
-- Etapa 11 — Semana do casal aparece nas duas contas
-- =====================================================================
-- Cole este script inteiro no Supabase SQL Editor e clique em Run.
-- Pode rodar mais de uma vez (é idempotente).
--
-- O que faz:
--   Uma "semana do casal" é uma semana conjunta (is_shared=true) com o
--   household_id do casal preenchido. Aqui ampliamos o RLS de LEITURA
--   para que a parceira vinculada (mesmo household + consentimento)
--   também veja essa semana e seus itens. Escrita continua só do dono,
--   então para a parceira a semana é somente-visualização.
-- =====================================================================

-- 1) Coluna que marca a qual casal a semana pertence (nulo = pessoal).
alter table public.weeks
  add column if not exists household_id uuid;

-- 2) Leitura ampliada em weeks: além da própria, a parceira do casal.
drop policy if exists "semana_casal_select" on public.weeks;
create policy "semana_casal_select"
  on public.weeks for select
  using (
    is_shared = true
    and household_id is not null
    and household_id = (
      select p.household_id from public.profiles p where p.id = auth.uid()
    )
    and (
      select p.share_consent from public.profiles p where p.id = auth.uid()
    ) = true
  );

-- 3) Leitura ampliada em week_items: itens de semanas do casal visíveis.
drop policy if exists "week_item_casal_select" on public.week_items;
create policy "week_item_casal_select"
  on public.week_items for select
  using (
    exists (
      select 1
      from public.weeks w
      where w.id = week_items.week_id
        and w.is_shared = true
        and w.household_id is not null
        and w.household_id = (
          select p.household_id from public.profiles p where p.id = auth.uid()
        )
        and (
          select p.share_consent from public.profiles p where p.id = auth.uid()
        ) = true
    )
  );
