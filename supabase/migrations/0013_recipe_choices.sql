-- =====================================================================
-- Etapa 13 — Ingredientes "à escolha" nas receitas
-- =====================================================================
-- Cole este script inteiro no Supabase SQL Editor e clique em Run.
-- Rode em DEV e em PRODUÇÃO.
--
-- Permite que uma receita tenha ingredientes que variam (ex.: "Carne" pode
-- ser patinho, acém ou músculo). Um grupo de escolha = várias linhas com o
-- mesmo choice_group e choice_label (uma por opção de alimento), com as mesmas
-- gramas. Ingrediente fixo = choice_group NULL (como já era).
-- =====================================================================

alter table public.recipe_ingredients
  add column if not exists choice_group integer;

alter table public.recipe_ingredients
  add column if not exists choice_label text;

comment on column public.recipe_ingredients.choice_group is
  'NULL = ingrediente fixo. Número = agrupa as opções de uma "escolha" (mesmo grupo/rótulo/gramas).';
