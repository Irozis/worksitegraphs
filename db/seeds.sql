-- Ensure the default station exists
INSERT INTO stations (name) VALUES ('Главный Распределительный Щит')
ON CONFLICT (name) DO NOTHING;

-- Ensure specific sensor objects exist for the default station
WITH station_cte AS (
    SELECT id FROM stations WHERE name = 'Главный Распределительный Щит' LIMIT 1 -- Ensure we get one ID if somehow duplicates existed (though name is unique on stations)
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
-- Use the unique constraint added to the objects table (station_id, name, unit)
-- to prevent duplicates if the seed script is run multiple times.
ON CONFLICT (station_id, name, unit) DO NOTHING;

-- 1) Управление старыми измерениями:
-- Команда `TRUNCATE measurements CASCADE;` была закомментирована для обеспечения
-- сохранения данных между запусками скрипта db:seed.
-- TRUNCATE measurements CASCADE;

-- 2) Вставим для каждого оборудования точки за последние 24 ч с шагом 1 минута
-- ВАЖНОЕ ПРИМЕЧАНИЕ ПО ИСТОРИЧЕСКИМ ДАННЫМ:
-- Поскольку не удалось автоматически добавить UNIQUE constraint `unique_measurement_object_time (object_id, ts)`
-- в таблицу `measurements` через `db/schema.sql` (из-за ограничений инструмента или среды),
-- предложение `ON CONFLICT (object_id, ts) DO NOTHING` НЕ БЫЛО ДОБАВЛЕНО к следующему INSERT блоку.
--
-- ПОСЛЕДСТВИЯ: Повторный запуск этого seed-скрипта (`npm run db:seed`) приведет к
-- ДОБАВЛЕНИЮ ДУБЛИРУЮЩИХСЯ ЗАПИСЕЙ для исторических данных (за последние 24 часа),
-- если временные периоды генерации пересекаются с уже существующими данными в таблице.
-- Это может быть нежелательно для анализа данных.
--
-- РЕКОМЕНДАЦИЯ: Для предотвращения дублирования исторических измерений при повторных запусках,
-- рассмотрите возможность добавления UNIQUE constraint вручную в вашу базу данных PostgreSQL:
--   ALTER TABLE measurements ADD CONSTRAINT unique_measurement_object_time UNIQUE (object_id, ts);
-- Если такой constraint будет добавлен, вы сможете изменить следующий INSERT блок, добавив:
--   ON CONFLICT (object_id, ts) DO NOTHING
-- Это позволит избежать дублирования без необходимости предварительной очистки таблицы.
INSERT INTO measurements(object_id, ts, value)
SELECT
  o.id AS object_id,
  gs.ts,
  -- Используются ПЛЕЙСХОЛДЕРЫ диапазонов для генерации исторических данных
  CASE o.unit
    WHEN 'Вольт'           THEN round((210 + random()*25)::numeric, 2)  -- Placeholder: 210-235 V
    WHEN 'Ампер'           THEN round((1 + random()*6.5)::numeric, 2)   -- Placeholder: 1.0-7.5 A
    WHEN 'Градус Цельсия'  THEN round((15 + random()*15)::numeric, 2)  -- Placeholder: 15-30 °C
    ELSE round(random()::numeric, 2) -- Default for other units
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
