-- Escolhas por receita num evento: mapa choice_group → food_id selecionado.
-- Ex.: {"1": "<uuid-do-patinho>"}. Vazio/ausente = usa a 1ª opção da escolha.
ALTER TABLE event_recipes ADD COLUMN choices JSONB DEFAULT '{}'::jsonb;
