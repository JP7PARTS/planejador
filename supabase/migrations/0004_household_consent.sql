-- =====================================================================
-- Etapa 8 — Tabela de auditoria household_links para rastreamento de
-- compartilhamento entre usuários do mesmo casal
-- =====================================================================
-- Cole este script inteiro no Supabase SQL Editor e clique em Run.
-- =====================================================================

-- 1) Tabela de links de compartilhamento (auditoria).
create table if not exists public.household_links (
  id                    uuid primary key default gen_random_uuid(),
  user_id_initiator     uuid not null references auth.users (id) on delete cascade,
  user_id_target        uuid not null references auth.users (id) on delete cascade,
  linked_household_id   uuid not null,
  created_at            timestamptz not null default now()
);

comment on table public.household_links is
  'Log de quando dois usuários ativaram compartilhamento (consolidação do casal).
   A segurança real vem de profiles.household_id + profiles.share_consent.';

-- 2) Row Level Security: cada pessoa pode ver links onde é initiator ou target.
alter table public.household_links enable row level security;

drop policy if exists "household_link_own" on public.household_links;
create policy "household_link_own"
  on public.household_links for select
  using (
    auth.uid() = user_id_initiator OR auth.uid() = user_id_target
  );

drop policy if exists "household_link_create" on public.household_links;
create policy "household_link_create"
  on public.household_links for insert
  with check (auth.uid() = user_id_initiator);
