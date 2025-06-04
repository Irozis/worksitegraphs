// File: server/src/index.ts

import express, { Request, Response } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { generateAndInsertMeasurements } from './dataGenerator';

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// STANDARD_SENSORS_CONFIG removed as it's no longer used by these refactored endpoints.
// Its equivalent logic for data generation is in dataGenerator.ts
// and for API data fetching, typeToUnitMap is used directly.

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // 1) GET /api/stations
  app.get('/api/stations', async (_req: Request, res: Response) => {
    try {
      const { rows } = await pool.query<{ name: string }>(
        `SELECT name FROM stations ORDER BY name;`
      );
      res.json(rows.map(r => ({
        name:     r.name,
        hasAlert: false,      // later можно вычислять наличие тревоги
      })));
    } catch (err) {
      console.error('Error fetching stations:', err);
      res.status(500).json({ error: 'Failed to fetch stations' });
    }
  });

  // Endpoint to get composite devices for a station
  // OLD Path: /api/stations/:stationName/objects
  // NEW: returns composite_devices, not sensors/objects directly
  app.get('/api/stations/:stationName/composite-devices', async (req: Request, res: Response) => {
    try {
      const stationName = req.params.stationName;
      const { rows } = await pool.query<{
        id: number;
        name: string;
        description: string;
        // created_at for composite_devices is not in schema, add if needed by frontend
      }>(
        `
        SELECT cd.id, cd.name, cd.description
        FROM composite_devices cd
        JOIN stations s ON cd.station_id = s.id
        WHERE s.name = $1
        ORDER BY cd.name;
        `,
        [stationName]
      );
      res.json(rows.map(r => ({
        id:          r.id,
        name:        r.name,
        // unit:        null, // Unit is not directly applicable to composite device
        location:    stationName,
        description: r.description,
        // createdAt:   r.created_at?.toISOString(), // Add if created_at is added to composite_devices
        hasAlert:    false, // Placeholder, logic can be added later
      })));
    } catch (err) {
      console.error('Error fetching composite devices for station:', err);
      res.status(500).json({ error: 'Failed to fetch composite devices' });
    }
  });

  // Endpoint to get details of a specific composite device
  // OLD Path: /api/objects/:objectId
  // NEW Path: /api/composite-devices/:compositeDeviceId
  app.get('/api/composite-devices/:compositeDeviceId', async (req: Request, res: Response) => {
    try {
      const compositeDeviceId = Number(req.params.compositeDeviceId);
      const { rows } = await pool.query<{
        id: number;
        name: string;
        description: string;
        station_name: string; // Renamed from 'station' for clarity
        // created_at for composite_devices is not in schema
      }>(
        `
        SELECT cd.id, cd.name, cd.description, s.name AS station_name
        FROM composite_devices cd
        JOIN stations s ON cd.station_id = s.id
        WHERE cd.id = $1;
        `,
        [compositeDeviceId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Composite device not found' });
      }
      const r = rows[0];
      res.json({
        id:          r.id,
        name:        r.name,
        // unit:        null, // Unit not applicable
        location:    r.station_name,
        description: r.description,
        // createdAt:   r.created_at?.toISOString(), // Add if created_at is added
        photoUrl:    '', // Placeholder
      });
    } catch (err) {
      console.error('Error fetching composite device details:', err);
      res.status(500).json({ error: 'Failed to fetch composite device' });
    }
  });

  // Endpoint to get data for a specific sensor type of a composite device
  // OLD Path: /api/objects/:objectId/data
  // NEW Path: /api/composite-devices/:compositeDeviceId/data
  app.get('/api/composite-devices/:compositeDeviceId/data', async (req: Request, res: Response) => {
    try {
      const compositeDeviceId = Number(req.params.compositeDeviceId);
      const { start, end, intervalMinutes = '1', type: requestedTypeQuery } = req.query;

      const typeToUnitMap: Record<string, string | undefined> = {
        'temperature': 'Градус Цельсия',
        'current': 'Ампер',
        'voltage': 'Вольт',
      };
      const requestedType = requestedTypeQuery as string;
      const targetUnit = typeToUnitMap[requestedType];

      if (!targetUnit) {
        // If type is not provided or invalid, return empty array for data.
        // This ensures the frontend chart for this type will show "No data".
        return res.json([]);
      }

      // Парсим границы
      const now    = Date.now();
      let startMs  = start ? Date.parse(start as string) : now - 24 * 60 * 60 * 1000;
      const endMs  = end   ? Date.parse(end   as string) : now;

      // Ограничение одного года
      const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
      if (endMs - startMs > ONE_YEAR_MS) {
        startMs = endMs - ONE_YEAR_MS;
      }

      // Шаг в миллисекундах (min 1 минута)
      const stepMs = Math.max(Number(intervalMinutes) * 60_000, 60_000);

      // Find the sensor_id for the given composite device and unit (derived from type)
      const sensorQuery = await pool.query(
        'SELECT id FROM sensors WHERE composite_device_id = $1 AND unit = $2',
        [compositeDeviceId, targetUnit] // targetUnit is from typeToUnitMap
      );

      if (sensorQuery.rows.length === 0) {
        // No specific sensor found for this composite device and unit type
        return res.json([]); // Send empty array, frontend chart will show "No data"
      }
      const sensorId = sensorQuery.rows[0].id;

      // Извлекаем все реальные замеры из БД для найденного sensorId
      const sql = `
        SELECT m.ts, m.value
        FROM measurements m
        WHERE m.sensor_id = $1 -- Use sensorId here
          AND m.ts >= (timestamp with time zone 'epoch' + $2 * INTERVAL '1 ms') -- startMs
          AND m.ts <= (timestamp with time zone 'epoch' + $3 * INTERVAL '1 ms') -- endMs
        ORDER BY m.ts;
      `;
      // Parameters for the query, using sensorId
      const queryParams = [sensorId, startMs, endMs];

      const { rows } = await pool.query<{ ts: Date; value: number }>(sql, queryParams);

      // Преобразуем в [{ t: ms, v: value }]
      const raw = rows.map(r => ({
        t: r.ts.getTime(),
        v: r.value,
      }));

      // Собираем полный ряд точек (New Resampling Logic)
      const result: Array<{ timestamp: string; value: number | null }> = [];
      let rawDataIdx = 0;

      for (let t = startMs; t <= endMs; t += stepMs) {
          // Skip raw data points that are definitively too old for this current tick t
          // A point raw[rawDataIdx].t is too old if it's earlier than t by more than half the interval step.
          while (rawDataIdx < raw.length && raw[rawDataIdx].t < t - (stepMs / 2) ) {
              rawDataIdx++;
          }

          if (rawDataIdx < raw.length && Math.abs(raw[rawDataIdx].t - t) < (stepMs / 2) ) {
              // If current raw point is close enough to t, use it
              result.push({ timestamp: new Date(t).toISOString(), value: raw[rawDataIdx].v });
              rawDataIdx++; // Consume this raw data point
          } else {
              // Otherwise, no suitable raw data point for this tick t using this simple lookahead.
              result.push({ timestamp: new Date(t).toISOString(), value: null });
              // Do not advance rawDataIdx here if raw[rawDataIdx].t is for a future t.
              // The while loop at the start will handle advancing it if it becomes too old for the *next* t.
          }
      }

      res.json(result);
    } catch (err) {
      console.error('Error fetching data:', err);
      res.status(500).json({ error: 'Failed to fetch data' });
    }
  });

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);

    // Schedule data generation after server starts
    if (process.env.NODE_ENV !== 'test') {
      cron.schedule('* * * * *', () => {
        console.log('Cron job triggered: generating new measurements for target sensors...');
        generateAndInsertMeasurements(pool).catch(err => {
          console.error('Error during scheduled measurement generation:', err);
        });
      });
      console.log('Scheduled data generation job to run every minute for target sensors.');
    }
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
