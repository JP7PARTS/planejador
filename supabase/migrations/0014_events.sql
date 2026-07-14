-- Events: refeições/eventos (janta com 7 pessoas, almoço com família, etc.)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NULL,
  base_people_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, title)
);

-- Event recipes: receitas adicionadas a um evento, com número de pessoas customizável
CREATE TABLE event_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes ON DELETE CASCADE,
  people_count INT DEFAULT 1,
  order_index INT,
  created_at TIMESTAMP DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_event_recipes_event_id ON event_recipes(event_id);
CREATE INDEX idx_event_recipes_recipe_id ON event_recipes(recipe_id);

-- RLS: eventos
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own events" ON events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events" ON events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events" ON events
  FOR DELETE USING (auth.uid() = user_id);

-- RLS: event_recipes (via event_id)
ALTER TABLE event_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view recipes in their events" ON event_recipes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_recipes.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add recipes to their events" ON event_recipes
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_recipes.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recipes in their events" ON event_recipes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_recipes.event_id
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recipes from their events" ON event_recipes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_recipes.event_id
      AND events.user_id = auth.uid()
    )
  );
