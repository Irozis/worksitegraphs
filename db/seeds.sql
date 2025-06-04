-- Ensure the default station exists
INSERT INTO stations (name) VALUES ('Главный Распределительный Щит')
ON CONFLICT (name) DO NOTHING;

-- Ensure specific sensor objects exist for the default station
WITH station_cte AS (
    SELECT id FROM stations WHERE name = 'Главный Распределительный Щит' LIMIT 1 -- Ensure we get one ID if somehow duplicates existed (though name is unique)
),
sensor_definitions (name, unit) AS (
    VALUES
        ('Датчик Температуры 1', 'Градус Цельсия'),
        ('Датчик Напряжения 1', 'Вольт'),
        ('Датчик Тока 1', 'Ампер')
)
INSERT INTO objects (station_id, name, unit)
SELECT s.id, sd.name, sd.unit
FROM station_cte s, sensor_definitions sd
-- This ON CONFLICT targets the 'name' column for conflict.
-- If an object with the same 'name' exists anywhere, it will do nothing.
-- This is a simplification for seeding. A more robust check might be
-- ON CONFLICT (station_id, name) DO NOTHING if that constraint existed,
-- or an INSERT...WHERE NOT EXISTS pattern.
ON CONFLICT (name) DO NOTHING;

-- 1) Очистим старые измерения
-- Using CASCADE because measurements table has foreign key to objects
TRUNCATE measurements CASCADE;

-- 2) Вставим для каждого оборудования точки за последние 24 ч с шагом 1 минута
INSERT INTO measurements(object_id, ts, value)
SELECT
  o.id AS object_id,
  gs.ts,
  -- здесь та же логика генерации, что и в коде (reverted to original)
  CASE o.unit
    WHEN 'Вольт'           THEN round((220 + random()*10)::numeric, 2)
    WHEN 'Ампер'           THEN round((5   + random()*2 )::numeric, 2)
    WHEN 'Градус Цельсия'  THEN round((25  + random()*2 )::numeric, 2)
    ELSE round(random()::numeric, 2)
  END AS value
FROM objects o
-- одно generate_series на каждую строку objects
CROSS JOIN LATERAL (
  SELECT generate_series(
    now() - interval '24 hours',
    now(),
    interval '1 minute' -- Data point every minute
  ) AS ts
) AS gs
ORDER BY o.id, gs.ts;
