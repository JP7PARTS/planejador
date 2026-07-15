-- Ingrediente principal da receita: define qual slot "puxa" a proporção ao
-- montar a semana. Fixo principal = 1 linha true; escolha principal = todas as
-- linhas daquele choice_group com true.
ALTER TABLE recipe_ingredients
  ADD COLUMN is_principal boolean NOT NULL DEFAULT false;
