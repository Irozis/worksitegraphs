import { Pool } from 'pg';

interface SensorTarget {
  name: string;
  unit: string;
  generateValue: () => number;
}

const SENSOR_TARGETS: SensorTarget[] = [
  {
    name: 'Датчик Температуры 1',
    unit: 'Градус Цельсия',
    generateValue: () => parseFloat((18 + Math.random() * 12).toFixed(2)), // 18.00 - 30.00 °C
  },
  {
    name: 'Датчик Напряжения 1',
    unit: 'Вольт',
    generateValue: () => parseFloat((210 + Math.random() * 20).toFixed(2)), // 210.00 - 230.00 V
  },
  {
    name: 'Датчик Тока 1',
    unit: 'Ампер',
    generateValue: () => parseFloat((0.5 + Math.random() * 9.5).toFixed(2)), // 0.50 - 10.00 A
  },
];

export async function generateAndInsertMeasurements(pool: Pool): Promise<void> {
  console.log('Generating new measurements for target sensors...');
  const client = await pool.connect();
  try {
    for (const target of SENSOR_TARGETS) {
      // Fetch object_id for the current target sensor
      const res = await client.query(
        'SELECT id FROM objects WHERE name = $1 AND unit = $2',
        [target.name, target.unit]
      );

      if (res.rows.length > 0) {
        const objectId = res.rows[0].id;
        const value = target.generateValue();
        const ts = new Date(); // Current timestamp

        await client.query(
          'INSERT INTO measurements (object_id, ts, value) VALUES ($1, $2, $3)',
          [objectId, ts, value]
        );
        console.log(`Inserted for ${target.name}: ${value} ${target.unit} at ${ts.toISOString()}`);
      } else {
        console.warn(`Object not found for ${target.name} (${target.unit}). Skipping measurement.`);
      }
    }
  } catch (error) {
    console.error('Error generating targeted measurements:', error);
  } finally {
    client.release();
  }
}
