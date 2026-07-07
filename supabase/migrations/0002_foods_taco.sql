-- =====================================================================
-- Etapa 3 — Tabela de Alimentos (foods) + Tabela TACO pré-populada
-- =====================================================================
-- Cole este script inteiro no Supabase SQL Editor e clique em Run.
-- =====================================================================

-- 1) Tabela de alimentos (cada pessoa tem a sua cópia).
create table if not exists public.foods (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  name                  text not null,
  category              text not null check (category in ('carbo', 'proteina', 'vegetal', 'fruta', 'outro')),
  kcal_per_100g         numeric not null default 0,
  protein_g_per_100g    numeric not null default 0,
  carb_g_per_100g       numeric not null default 0,
  fat_g_per_100g        numeric not null default 0,
  fc                    numeric not null default 1.0,
  created_at            timestamptz not null default now(),
  unique(user_id, name)
);

comment on table public.foods is
  'Banco de alimentos do usuário. Cada pessoa tem seus alimentos separados.
   Nutrição é sempre do alimento cru (TACO). FC = fator cocção (cru → pronto).';

-- 2) Row Level Security: cada pessoa só vê e mexe nos seus alimentos.
alter table public.foods enable row level security;

drop policy if exists "alimento_proprio_select" on public.foods;
create policy "alimento_proprio_select"
  on public.foods for select
  using (auth.uid() = user_id);

drop policy if exists "alimento_proprio_insert" on public.foods;
create policy "alimento_proprio_insert"
  on public.foods for insert
  with check (auth.uid() = user_id);

drop policy if exists "alimento_proprio_update" on public.foods;
create policy "alimento_proprio_update"
  on public.foods for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "alimento_proprio_delete" on public.foods;
create policy "alimento_proprio_delete"
  on public.foods for delete
  using (auth.uid() = user_id);

-- 3) Função que copia a Tabela TACO para o novo usuário automaticamente.
create or replace function public.populate_taco_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  taco_foods record;
begin
  -- Tabela TACO com alimentos básicos (nutrição por 100g cru, FC padrão).
  for taco_foods in (
    select * from (values
      -- Carbo
      ('Arroz branco', 'carbo', 130, 2.7, 28, 0.3, 2.86),
      ('Arroz integral', 'carbo', 112, 2.6, 23.5, 0.9, 2.45),
      ('Batata-doce cozida', 'carbo', 86, 1.6, 20.1, 0.1, 1.0),
      ('Batata cozida', 'carbo', 77, 1.7, 17.1, 0.1, 0.94),
      ('Feijão carioca', 'carbo', 76, 5.2, 13.9, 0.3, 2.10),
      ('Aveia em flocos', 'carbo', 389, 13.7, 66.3, 7.9, 1.0),
      ('Pão integral', 'carbo', 265, 9, 48, 3.3, 1.0),

      -- Proteína
      ('Frango grelhado', 'proteina', 165, 31, 0, 3.6, 0.82),
      ('Peito de frango cru', 'proteina', 165, 31, 0, 3.6, 0.82),
      ('Ovos', 'proteina', 155, 13, 1.1, 11, 0.88),
      ('Carne moída refogada', 'proteina', 214, 25.7, 0, 11.7, 0.74),
      ('Carne moída crua', 'proteina', 250, 19, 0, 20, 0.74),
      ('Peito de peru', 'proteina', 135, 28.5, 0, 1.5, 0.80),
      ('Atum enlataado', 'proteina', 132, 29.7, 0, 0.9, 1.0),

      -- Vegetal
      ('Brócolis cozido', 'vegetal', 34, 2.8, 7, 0.4, 1.0),
      ('Cenoura cozida', 'vegetal', 41, 0.9, 9.6, 0.2, 1.0),
      ('Espinafre cozido', 'vegetal', 23, 2.7, 3.6, 0.4, 1.0),
      ('Abóbora cozida', 'vegetal', 37, 1.2, 8.8, 0.1, 1.0),
      ('Alface', 'vegetal', 15, 1.2, 2.9, 0.2, 1.0),
      ('Tomate', 'vegetal', 18, 0.9, 3.9, 0.2, 1.0),

      -- Fruta
      ('Banana', 'fruta', 89, 1.1, 23, 0.3, 1.0),
      ('Maçã', 'fruta', 52, 0.3, 14, 0.2, 1.0),
      ('Laranja', 'fruta', 47, 0.9, 12, 0.2, 1.0),
      ('Morango', 'fruta', 32, 0.8, 8, 0.3, 1.0),
      ('Melancia', 'fruta', 30, 0.6, 7.6, 0.4, 1.0)
    ) as taco(
      name, category, kcal, protein, carb, fat, fc
    )
  )
  loop
    insert into public.foods (
      user_id, name, category, kcal_per_100g, protein_g_per_100g,
      carb_g_per_100g, fat_g_per_100g, fc
    ) values (
      new.id, taco_foods.name, taco_foods.category, taco_foods.kcal,
      taco_foods.protein, taco_foods.carb, taco_foods.fat, taco_foods.fc
    )
    on conflict (user_id, name) do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists populate_taco_on_new_user on auth.users;
create trigger populate_taco_on_new_user
  after insert on auth.users
  for each row execute function public.populate_taco_for_new_user();
