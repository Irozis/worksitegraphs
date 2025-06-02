-- 1) Сначала очистим старые измерения (не обязательно, но если вы пересоздаёте часто)
TRUNCATE measurements;

-- 2) Вставим для каждого оборудования точки за последние 24 ч с шагом 1 минута
INSERT INTO measurements(object_id, ts, value)
SELECT
  o.id AS object_id,
  gs.ts,
  -- здесь та же логика генерации, что и в коде
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
    interval '1 minute'
  ) AS ts
) AS gs
ORDER BY o.id, gs.ts;
