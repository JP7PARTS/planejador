-- Composição de pessoas da refeição: adultos + crianças (porções equivalentes).
-- Fatores: adulto ×1,0 · criança 7–12 ×0,6 · criança até 6 ×0,4.
ALTER TABLE events ADD COLUMN adults INT;
ALTER TABLE events ADD COLUMN kids_older INT DEFAULT 0;  -- 7–12, ×0,6
ALTER TABLE events ADD COLUMN kids_young INT DEFAULT 0;  -- até 6, ×0,4

-- Retrocompat: refeições já criadas viram "adults = total atual, 0 crianças".
UPDATE events SET adults = base_people_count WHERE adults IS NULL;

ALTER TABLE events ALTER COLUMN adults SET DEFAULT 1;
