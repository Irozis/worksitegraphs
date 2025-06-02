"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const pool = new pg_1.Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});
const PORT = Number(process.env.PORT) || 3001;
// Генерация случайных значений в диапазоне
function generateRandomValue(unit, lastValue) {
    switch (unit) {
        case 'Вольт': return parseFloat((lastValue + (Math.random() * 5 - 2.5)).toFixed(2));
        case 'Ампер': return parseFloat((lastValue + (Math.random() * 2 - 1)).toFixed(2));
        case 'Градус Цельсия': return parseFloat((lastValue + (Math.random() * 5 - 2.5)).toFixed(2));
        case 'Бар': return parseFloat((lastValue + (Math.random() * 0.5 - 0.25)).toFixed(2));
        case 'Гц': return parseFloat((lastValue + (Math.random() * 1 - 0.5)).toFixed(2));
        default: return parseFloat((lastValue + (Math.random() * 10 - 5)).toFixed(2));
    }
}
async function startServer() {
    await pool.query("SET client_encoding = 'UTF8';");
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    // Эндпоинт для списка оборудования
    app.get('/api/equipment', async (_req, res) => {
        try {
            const result = await pool.query('SELECT id, name, unit, location FROM equipment ORDER BY id');
            res.json(result.rows);
        }
        catch (err) {
            console.error('Error fetching equipment list', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.get('/api/stations', async (_req, res) => {
        try {
            const locRes = await pool.query('SELECT DISTINCT location FROM equipment ORDER BY location');
            const stations = locRes.rows.map((r, idx) => ({ id: idx + 1, name: r.location, hasAlert: false }));
            res.json(stations);
        }
        catch (err) {
            console.error('Error fetching stations:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.get('/api/stations/:stationId/objects', async (req, res) => {
        try {
            const stationId = parseInt(req.params.stationId, 10);
            const locRes = await pool.query('SELECT DISTINCT location FROM equipment ORDER BY location');
            const locations = locRes.rows.map(r => r.location);
            const location = locations[stationId - 1];
            if (!location)
                return res.status(404).json({ error: 'Station not found' });
            const eqRes = await pool.query('SELECT id, name, unit, location FROM equipment WHERE location = $1', [location]);
            const objects = eqRes.rows.map(r => ({
                ...r,
                description: 'Описание не задано',
                createdAt: new Date().toISOString(),
                hasAlert: false
            }));
            res.json(objects);
        }
        catch (err) {
            console.error('Error fetching objects:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    /*
      Эндпоинт для данных по оборудованию с параметрами:
        - rangeHours (number): сколько часов брать назад
        - rangeDays (number): сколько дней брать назад
        - intervalMinutes (number): шаг интервала в минутах
        - intervalHours (number): шаг интервала в часах
      Примеры:
        /api/equipment/1/data?rangeHours=24&intervalMinutes=30
        /api/equipment/1/data?rangeDays=7&intervalHours=12
    */
    app.get('/api/equipment/:id/data', async (req, res) => {
        try {
            const equipmentId = req.params.id;
            // Получаем единицу измерения
            const meta = await pool.query('SELECT unit FROM equipment WHERE id = $1', [equipmentId]);
            const unit = meta.rows[0]?.unit || '';
            // Параметры диапазона и шага
            const rh = req.query.rangeHours ? parseFloat(req.query.rangeHours) : undefined;
            const rd = req.query.rangeDays ? parseFloat(req.query.rangeDays) : undefined;
            const im = req.query.intervalMinutes ? parseFloat(req.query.intervalMinutes) : undefined;
            const ih = req.query.intervalHours ? parseFloat(req.query.intervalHours) : undefined;
            const now = Date.now();
            let startTime = now - 60 * 60 * 1000; // дефолт 1 час назад
            if (rd !== undefined)
                startTime = now - rd * 24 * 60 * 60 * 1000;
            else if (rh !== undefined)
                startTime = now - rh * 60 * 60 * 1000;
            let stepMs = 60 * 1000; // дефолт 1 минута
            if (ih !== undefined)
                stepMs = ih * 60 * 60 * 1000;
            else if (im !== undefined)
                stepMs = im * 60 * 1000;
            // Получаем последнее значение из БД
            const lastDbRes = await pool.query('SELECT value FROM equipment_data WHERE equipment_id = $1 ORDER BY timestamp DESC LIMIT 1', [equipmentId]);
            const lastValue = lastDbRes.rows[0]?.value ? parseFloat(lastDbRes.rows[0].value) : 0;
            // Генерируем точки
            const dataPoints = [];
            for (let t = startTime; t <= now; t += stepMs) {
                dataPoints.push({
                    timestamp: new Date(t).toISOString(),
                    value: generateRandomValue(unit, lastValue)
                });
            }
            res.json(dataPoints);
        }
        catch (err) {
            console.error(`Error fetching data for equipment ${req.params.id}`, err);
            res.status(500).json({ error: 'Internal server error' });
        }
    });
    app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
}
startServer().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
