CREATE TABLE stations (
  id   SERIAL PRIMARY KEY,
  name TEXT    NOT NULL UNIQUE
);

CREATE TABLE sensors ( -- Renamed from objects
  id SERIAL PRIMARY KEY,
  composite_device_id INT NOT NULL REFERENCES composite_devices(id) ON DELETE CASCADE, -- New FK
  name TEXT NOT NULL, -- Name of the sensor itself, e.g., "Primary Thermistor"
  unit TEXT NOT NULL, -- e.g., 'Вольт', 'Ампер', 'Градус Цельсия'
  description TEXT DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_sensor_for_device UNIQUE (composite_device_id, unit) -- New unique constraint
);

CREATE TABLE measurements (
  id        SERIAL PRIMARY KEY,
  sensor_id INT     NOT NULL REFERENCES sensors(id) ON DELETE CASCADE, -- Renamed and FK updated
  ts        TIMESTAMPTZ NOT NULL,
  value     NUMERIC NOT NULL
  -- The unique constraint on (sensor_id, ts) will be attempted via ALTER TABLE later
);
-- Index for faster search by sensor_id and timestamp
CREATE INDEX ON measurements(sensor_id, ts); -- Changed from object_id

CREATE TABLE composite_devices (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  station_id INT NOT NULL REFERENCES stations(id) ON DELETE CASCADE
);

-- Attempt to add unique constraint to measurements table
-- This has failed in previous attempts via direct CREATE TABLE modification or full overwrite.
-- If this ALTER TABLE command also fails, the constraint will remain unadded.
ALTER TABLE measurements ADD CONSTRAINT unique_measurement_sensor_time UNIQUE (sensor_id, ts);