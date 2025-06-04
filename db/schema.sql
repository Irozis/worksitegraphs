CREATE TABLE stations (
  id   SERIAL PRIMARY KEY,
  name TEXT    NOT NULL UNIQUE
);

CREATE TABLE objects (
  id          SERIAL PRIMARY KEY,
  station_id  INT    NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
  name        TEXT   NOT NULL,
  unit        TEXT   NOT NULL,           -- 'Вольт', 'Ампер', 'Градус Цельсия' и т.д.
  description TEXT   DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_station_object_name_unit UNIQUE (station_id, name, unit)
);

CREATE TABLE measurements (
  id        SERIAL PRIMARY KEY,
  object_id INT     NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  ts        TIMESTAMPTZ NOT NULL,
  value     NUMERIC NOT NULL
);
-- индекс для быстрого поиска по object+time
CREATE INDEX ON measurements(object_id, ts);