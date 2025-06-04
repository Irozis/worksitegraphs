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

  // 2) GET /api/stations/:stationName/objects
  app.get('/api/stations/:stationName/objects', async (req: Request, res: Response) => {
    try {
      const stationName = req.params.stationName;
      const { rows } = await pool.query<{
        id: number;
        name: string;
        unit: string;
        description: string;
        created_at: Date;
      }>(
        `
        SELECT o.id, o.name, o.unit, o.description, o.created_at
        FROM objects o
        JOIN stations s ON o.station_id = s.id
        WHERE s.name = $1
        ORDER BY o.name;
        `,
        [stationName]
      );
      res.json(rows.map(r => ({
        id:          r.id,
        name:        r.name,
        unit:        r.unit,
        location:    stationName,
        description: r.description,
        createdAt:   r.created_at.toISOString(),
        hasAlert:    false,
      })));
    } catch (err) {
      console.error('Error fetching objects for station:', err);
      res.status(500).json({ error: 'Failed to fetch objects' });
    }
  });

  // 3) GET /api/objects/:objectId
  app.get('/api/objects/:objectId', async (req: Request, res: Response) => {
    try {
      const objectId = Number(req.params.objectId);
      const { rows } = await pool.query<{
        id: number;
        name: string;
        unit: string;
        description: string;
        created_at: Date;
        station: string;
      }>(
        `
        SELECT o.id, o.name, o.unit, o.description, o.created_at, s.name AS station
        FROM objects o
        JOIN stations s ON o.station_id = s.id
        WHERE o.id = $1;
        `,
        [objectId]
      );
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Object not found' });
      }
      const r = rows[0];
      res.json({
        id:          r.id,
        name:        r.name,
        unit:        r.unit,
        location:    r.station,
        description: r.description,
        createdAt:   r.created_at.toISOString(),
        photoUrl:    '',      // при необходимости заполните URL фотографии
      });
    } catch (err) {
      console.error('Error fetching object details:', err);
      res.status(500).json({ error: 'Failed to fetch object' });
    }
  });

  // 4) GET /api/objects/:objectId/data
  //    Возвращает ровно (end–start)/intervalMinutes +1 точек, max диапазон = 1 год
  app.get('/api/objects/:objectId/data', async (req: Request, res: Response) => {
    try {
      const objectId = Number(req.params.objectId);
      const { start, end, intervalMinutes = '1' } = req.query;

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

      // Извлекаем все реальные замеры из БД
      const sql = `
        SELECT ts, value
        FROM measurements
        WHERE object_id = $1
          AND ts >= (timestamp with time zone 'epoch' + $2 * INTERVAL '1 ms')
          AND ts <= (timestamp with time zone 'epoch' + $3 * INTERVAL '1 ms')
        ORDER BY ts;
      `;
      const { rows } = await pool.query<{ ts: Date; value: number }>(
        sql,
        [objectId, startMs, endMs]
      );

      // Преобразуем в [{ t: ms, v: value }]
      const raw = rows.map(r => ({
        t: r.ts.getTime(),
        v: r.value,
      }));

      // Собираем полный ряд точек
      const result: Array<{ timestamp: string; value: number | null }> = [];
      let idx = 0;
      for (let t = startMs; t <= endMs; t += stepMs) {
        if (idx < raw.length && Math.abs(raw[idx].t - t) < stepMs / 2) {
          result.push({
            timestamp: new Date(t).toISOString(),
            value:     raw[idx].v,
          });
          idx++;
        } else {
          result.push({
            timestamp: new Date(t).toISOString(),
            value:     null,
          });
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
