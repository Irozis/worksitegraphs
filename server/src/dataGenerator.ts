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
    // Placeholder: 15-30 °C
    generateValue: () => parseFloat((15 + Math.random() * 15).toFixed(2)),
  },
  {
    name: 'Датчик Напряжения 1',
    unit: 'Вольт',
    // Placeholder: 210-235 V
    generateValue: () => parseFloat((210 + Math.random() * 25).toFixed(2)),
  },
  {
    name: 'Датчик Тока 1',
    unit: 'Ампер',
    // Placeholder: 1.0-7.5 A
    generateValue: () => parseFloat((1 + Math.random() * 6.5).toFixed(2)),
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
