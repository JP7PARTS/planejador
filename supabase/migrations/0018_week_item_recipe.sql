-- Agrupamento de receita na semana: marca de qual receita cada item veio, para
-- reabrir a semana com o "cartão de prato" agrupado. NULL = alimento avulso.
-- ON DELETE SET NULL: apagar a receita não apaga o item — só desagrupa.
ALTER TABLE week_items
  ADD COLUMN recipe_id uuid REFERENCES recipes (id) ON DELETE SET NULL;
