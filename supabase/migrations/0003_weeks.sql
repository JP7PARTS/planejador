-- =====================================================================
-- Etapa 7 — Tabelas de Semanas (weeks) e Items (week_items) + RLS
-- =====================================================================
-- Cole este script inteiro no Supabase SQL Editor e clique em Run.
-- =====================================================================

-- 1) Tabela de semanas salvas (cada pessoa tem as suas).
create table if not exists public.weeks (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users (id) on delete cascade,
  title                    text not null,
  notes                    text,
  num_marmitas             numeric not null default 7,
  is_favorite              boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique(user_id, title)
);

comment on table public.weeks is
  'Semanas salvas do usuário. Cada pessoa tem suas próprias semanas.';

-- 2) Tabela de alimentos da semana (items de cada semana).
create table if not exists public.week_items (
  id                       uuid primary key default gen_random_uuid(),
  week_id                  uuid not null references public.weeks (id) on delete cascade,
  food_id                  uuid not null references public.foods (id) on delete cascade,
  cooked_grams_per_marmita numeric not null,
  num_marmitas             numeric not null,
  created_at               timestamptz not null default now()
);

comment on table public.week_items is
  'Items de alimentos de cada semana. Segurança herda de weeks via week_id.';

-- 3) Row Level Security para weeks: cada pessoa só vê e mexe nas suas.
alter table public.weeks enable row level security;

drop policy if exists "semana_proprio_select" on public.weeks;
create policy "semana_proprio_select"
  on public.weeks for select
  using (auth.uid() = user_id);

drop policy if exists "semana_proprio_insert" on public.weeks;
create policy "semana_proprio_insert"
  on public.weeks for insert
  with check (auth.uid() = user_id);

drop policy if exists "semana_proprio_update" on public.weeks;
create policy "semana_proprio_update"
  on public.weeks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "semana_proprio_delete" on public.weeks;
create policy "semana_proprio_delete"
  on public.weeks for delete
  using (auth.uid() = user_id);

-- 4) Row Level Security para week_items: acesso via week_id (herda de weeks).
alter table public.week_items enable row level security;

drop policy if exists "week_item_via_week" on public.week_items;
create policy "week_item_via_week"
  on public.week_items for select
  using (
    exists (
      select 1 from public.weeks
      where weeks.id = week_items.week_id
      and weeks.user_id = auth.uid()
    )
  );

drop policy if exists "week_item_insert_via_week" on public.week_items;
create policy "week_item_insert_via_week"
  on public.week_items for insert
  with check (
    exists (
      select 1 from public.weeks
      where weeks.id = week_items.week_id
      and weeks.user_id = auth.uid()
    )
  );

drop policy if exists "week_item_update_via_week" on public.week_items;
create policy "week_item_update_via_week"
  on public.week_items for update
  using (
    exists (
      select 1 from public.weeks
      where weeks.id = week_items.week_id
      and weeks.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.weeks
      where weeks.id = week_items.week_id
      and weeks.user_id = auth.uid()
    )
  );

drop policy if exists "week_item_delete_via_week" on public.week_items;
create policy "week_item_delete_via_week"
  on public.week_items for delete
  using (
    exists (
      select 1 from public.weeks
      where weeks.id = week_items.week_id
      and weeks.user_id = auth.uid()
    )
  );
