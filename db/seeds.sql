-- Ensure the default station exists
INSERT INTO stations (name) VALUES ('Главный Распределительный Щит')
ON CONFLICT (name) DO NOTHING;

-- Seed Composite Devices
WITH station_cte AS (
    SELECT id FROM stations WHERE name = 'Главный Распределительный Щит' LIMIT 1
)
INSERT INTO composite_devices (name, description, station_id)
SELECT 'Pump A', 'Main water pump system', s.id FROM station_cte s
ON CONFLICT (name) DO NOTHING;

WITH station_cte AS (
    SELECT id FROM stations WHERE name = 'Главный Распределительный Щит' LIMIT 1
)
INSERT INTO composite_devices (name, description, station_id)
SELECT 'Motor B', 'Primary ventilation motor', s.id FROM station_cte s
ON CONFLICT (name) DO NOTHING;

-- Seed Sensors for Composite Devices
-- Creates a standard set of sensors (Temperature, Voltage, Current) for each specified composite device.
WITH composite_device_cte AS (
    SELECT id FROM composite_devices WHERE name IN ('Pump A', 'Motor B') -- Add more device names here if needed
),
sensor_definitions (s_name, s_unit, s_desc) AS (
    VALUES
        ('Temperature Sensor', 'Градус Цельсия', 'Measures temperature'),
        ('Voltage Sensor', 'Вольт', 'Measures voltage'),
        ('Current Sensor', 'Ампер', 'Measures current')
)
INSERT INTO sensors (composite_device_id, name, unit, description)
SELECT
    cdc.id,
    sd.s_name,
    sd.s_unit,
    sd.s_desc || ' for ' || (SELECT name FROM composite_devices WHERE id = cdc.id) -- Appends device name to description
FROM composite_device_cte cdc, sensor_definitions sd
ON CONFLICT (composite_device_id, unit) DO NOTHING; -- Assumes unique_sensor_for_device (composite_device_id, unit) constraint exists

-- 1) Управление старыми измерениями:
-- Команда `TRUNCATE measurements CASCADE;` была закомментирована для обеспечения
-- сохранения данных между запусками скрипта db:seed.
-- TRUNCATE measurements CASCADE;

-- 2) Вставим для каждого СЕНСОРА точки за последние 24 ч с шагом 1 минута
-- ИСТОРИЧЕСКИЕ ДАННЫЕ ДЛЯ СЕНСОРОВ:
-- Используется `ON CONFLICT (sensor_id, ts) DO NOTHING` для предотвращения дубликатов,
-- так как в `db/schema.sql` была предпринята попытка добавить UNIQUE constraint
-- `unique_measurement_sensor_time (sensor_id, ts)` в таблицу `measurements`
-- с помощью `ALTER TABLE`. Если этот constraint успешно применился при настройке БД,
-- дубликаты исторических данных будут предотвращены. Если constraint не был создан
-- (например, из-за существующего индекса или других проблем БД при выполнении `ALTER TABLE`),
-- то `ON CONFLICT` не будет иметь эффекта без уникального индекса/констрейнта,
-- и дубликаты могут возникнуть при повторных запусках.
INSERT INTO measurements(sensor_id, ts, value)
SELECT
  s.id AS sensor_id, -- Selecting from the 'sensors' table aliased as 's'
  gs.ts,
  -- Используются ПЛЕЙСХОЛДЕРЫ диапазонов для генерации исторических данных
  CASE s.unit -- Using s.unit from the 'sensors' table
    WHEN 'Вольт'           THEN round((210 + random()*25)::numeric, 2)  -- Placeholder: 210-235 V
    WHEN 'Ампер'           THEN round((1 + random()*6.5)::numeric, 2)   -- Placeholder: 1.0-7.5 A
    WHEN 'Градус Цельсия'  THEN round((15 + random()*15)::numeric, 2)  -- Placeholder: 15-30 °C
    ELSE round(random()::numeric, 2) -- Default for other units
  END AS value
FROM sensors s -- Iterating over the 'sensors' table
CROSS JOIN LATERAL (
  SELECT generate_series(
    now() - interval '24 hours',
    now(),
    interval '1 minute' -- Data point every minute
  ) AS ts
) AS gs
ON CONFLICT (sensor_id, ts) DO NOTHING -- Using the unique constraint on measurements
ORDER BY s.id, gs.ts;
