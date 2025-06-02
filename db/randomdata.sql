-- файл: db/randomdata.sql

-- (1) По желанию очистить старые замеры
TRUNCATE measurements;

-- (2) Засеять показания каждую минуту за последние 24 часа
INSERT INTO measurements (object_id, ts, value)
SELECT
  o.id      AS object_id,
  gs.ts     AS ts,
  CASE eq.unit
    WHEN 'Вольт'           THEN ROUND((218 + RANDOM() * 5)::numeric, 2)
    WHEN 'Ампер'           THEN ROUND((  1 + RANDOM() * 5)::numeric, 2)
    WHEN 'Градус Цельсия'  THEN ROUND(( 20 + RANDOM() *10)::numeric, 2)
    ELSE                      ROUND((RANDOM() *100)::numeric, 2)
  END        AS value
FROM objects o
  -- связываем запись объекта с записью оборудования
  -- по совпадению их id
  JOIN equipment eq
    ON eq.id = o.id
  -- для каждой такой пары генерим каждую минуту
  CROSS JOIN LATERAL (
    SELECT generate_series(
      NOW() - INTERVAL '24 hours',
      NOW(),
      '1 minute'
    ) AS ts
  ) AS gs
ORDER BY o.id, gs.ts;
