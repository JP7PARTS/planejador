-- =====================================================================
-- Etapa 22 — Nome de compra (alimento cru na lista de compras)
-- =====================================================================
-- Cole este script inteiro no Supabase SQL Editor e clique em Run.
-- Rodar em dev E produção.
-- =====================================================================

-- Nome usado só na lista de compras (o alimento cru que se compra no mercado).
-- Vazio/null = usa o `name` normal. Alimentos com o mesmo shopping_name juntam
-- numa linha só na lista de compras (ex.: "Acém cozido" + "Acém grelhado" → "Acém").
alter table public.foods add column if not exists shopping_name text;

comment on column public.foods.shopping_name is
  'Nome de compra (alimento cru) exibido na lista de compras. Null = usa name.
   Alimentos com o mesmo shopping_name somam numa linha só na lista de compras.';
