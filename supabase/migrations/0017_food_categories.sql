-- Novas categorias de alimento: Gordura (azeite, óleo, manteiga...) e
-- Molho/Tempero (molho de tomate, mostarda, shoyu...). Recria o CHECK da
-- coluna category (antes só carbo/proteina/vegetal/fruta/outro).
ALTER TABLE foods DROP CONSTRAINT foods_category_check;

ALTER TABLE foods ADD CONSTRAINT foods_category_check
  CHECK (category IN ('carbo', 'proteina', 'vegetal', 'fruta', 'gordura', 'molho', 'outro'));
