-- =====================================================================
-- Etapa 2 — Perfis (profiles) + Segurança por linha (RLS)
-- =====================================================================
-- Cole este script inteiro no Supabase:
--   Painel do projeto -> SQL Editor -> New query -> cole tudo -> Run.
-- Pode rodar mais de uma vez sem problema (é idempotente).
-- =====================================================================

-- 1) Tabela de perfis: 1 linha por pessoa (id = usuário do Supabase Auth).
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null default '',
  household_id  uuid not null default gen_random_uuid(),
  share_consent boolean not null default false,
  created_at    timestamptz not null default now()
);

comment on table public.profiles is
  'Perfil de cada pessoa. household_id agrupa o casal; share_consent controla a soma dos totais.';

-- 2) Liga o Row Level Security (cada pessoa só enxerga a própria linha).
alter table public.profiles enable row level security;

-- 3) Políticas de acesso (recriadas para poder rodar o script de novo).
drop policy if exists "perfil_proprio_select" on public.profiles;
create policy "perfil_proprio_select"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "perfil_proprio_update" on public.profiles;
create policy "perfil_proprio_update"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "perfil_proprio_insert" on public.profiles;
create policy "perfil_proprio_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 4) Cria o perfil automaticamente quando um novo usuário se cadastra.
--    O nome vem dos metadados enviados pela tela de cadastro (display_name).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
