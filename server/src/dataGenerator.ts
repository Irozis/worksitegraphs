import { Pool } from 'pg';

// Placeholder value generation logic
const placeholderValueGenerators: Record<string, () => number> = {
  'Градус Цельсия': () => parseFloat((15 + Math.random() * 15).toFixed(2)), // Placeholder: 15-30 °C
  'Вольт': () => parseFloat((210 + Math.random() * 25).toFixed(2)),          // Placeholder: 210-235 V
  'Ампер': () => parseFloat((1 + Math.random() * 6.5).toFixed(2)),            // Placeholder: 1.0-7.5 A
};

// Define which composite devices and which of their standard sensor units should have data generated.
const TARGET_COMPOSITE_DEVICE_NAMES = ['Pump A', 'Motor B'];
const STANDARD_UNITS_TO_GENERATE = ['Градус Цельсия', 'Вольт', 'Ампер'];

export async function generateAndInsertMeasurements(pool: Pool): Promise<void> {
  console.log('Generating new measurements for composite devices...');
  const client = await pool.connect();
  try {
    for (const deviceName of TARGET_COMPOSITE_DEVICE_NAMES) {
      // 1. Get composite_device_id for the current deviceName
      const deviceRes = await client.query(
        'SELECT id FROM composite_devices WHERE name = $1',
        [deviceName]
      );

      if (deviceRes.rows.length === 0) {
        console.warn(`Composite device named '${deviceName}' not found. Skipping measurement generation for it.`);
        continue; // Skip to the next deviceName
      }
      const compositeDeviceId = deviceRes.rows[0].id;
      console.log(`Processing composite device: ${deviceName} (ID: ${compositeDeviceId})`);

      for (const unit of STANDARD_UNITS_TO_GENERATE) {
        // 2. Find the sensor_id for this composite device and unit
        //    Note: The 'sensors' table has a 'name' column (e.g., 'Temperature Sensor').
        //    We are selecting based on (composite_device_id, unit) which is constrained to be unique.
        const sensorRes = await client.query(
          'SELECT id, name FROM sensors WHERE composite_device_id = $1 AND unit = $2',
          [compositeDeviceId, unit]
        );

        if (sensorRes.rows.length > 0) {
          const sensorId = sensorRes.rows[0].id;
          const sensorName = sensorRes.rows[0].name; // For logging
          const generateValue = placeholderValueGenerators[unit];

          if (generateValue) {
            const value = generateValue();
            const ts = new Date(); // Current timestamp

            await client.query(
              'INSERT INTO measurements (sensor_id, ts, value) VALUES ($1, $2, $3)',
              [sensorId, ts, value]
            );
            // Updated log to be more informative
            console.log(`  Inserted for ${deviceName} -> ${sensorName} (ID: ${sensorId}, Unit: ${unit}): ${value} at ${ts.toISOString()}`);
          } else {
            // This case should ideally not be reached if STANDARD_UNITS_TO_GENERATE and placeholderValueGenerators are aligned.
            console.warn(`  No value generator defined for unit '${unit}' (Sensor ID: ${sensorId}) on device '${deviceName}'.`);
          }
        } else {
          console.warn(`  Sensor with unit '${unit}' not found for composite device '${deviceName}'. Skipping.`);
        }
      }
    }
  } catch (error) {
    console.error('Error generating measurements for composite devices:', error);
  } finally {
    client.release();
  }
}
