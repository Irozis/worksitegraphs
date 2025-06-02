// File: client/src/components/ChartModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import useFetch from '../hooks/useFetch';
import './ChartModal.css';

// В точке данных будем хранить значение или null
interface DataPoint {
  timestamp: string;
  value: number | null;
}

type Metric = 'voltage' | 'current' | 'temperature';

interface ChartModalProps {
  visible: boolean;
  onClose: () => void;
  objectId: number;
  type: Metric;
  onAlert?: (timestamp: string, value: number) => void;
}

const ChartModal: React.FC<ChartModalProps> = ({
  visible,
  onClose,
  objectId,
  type,
  onAlert,
}) => {
  if (!visible) return null;

  // Закрытие по Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const titleMap: Record<Metric, string> = {
    voltage: 'Напряжение / Время',
    current: 'Ток / Время',
    temperature: 'Температура / Время',
  };
  const title = titleMap[type];

  // Параметры диапазона
  const now = new Date();
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 16);

  const [start, setStart] = useState<string>(fmt(ago24h));
  const [end, setEnd] = useState<string>(fmt(now));
  const [intervalMin, setIntervalMin] = useState<number>(5);
  const [minBound, setMinBound] = useState<string>('');
  const [maxBound, setMaxBound] = useState<string>('');

  // Запрос сырых данных
  const query = `?start=${encodeURIComponent(start)}&end=${encodeURIComponent(
    end
  )}&intervalMinutes=${intervalMin}&type=${type}`;
  const { data: rawData } = useFetch<{ timestamp: string; value: number }[]>(
    `/api/objects/${objectId}/data${query}`
  );

  // Обработка: генерируем всю шкалу времени и смешиваем с сырыми данными
  const chartData = useMemo<DataPoint[]>(() => {
    if (!start || !end) return [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    const timeline: DataPoint[] = [];

    for (
      let cursor = new Date(startDate);
      cursor <= endDate;
      cursor = new Date(cursor.getTime() + intervalMin * 60 * 1000)
    ) {
      timeline.push({ timestamp: cursor.toISOString(), value: null });
    }

    const map = new Map<string, number>();
    rawData?.forEach(d => {
      const dt = new Date(d.timestamp);
      dt.setSeconds(0, 0);
      map.set(dt.toISOString(), d.value);
    });

    return timeline.map(pt => {
      const val = map.get(pt.timestamp);
      return { timestamp: pt.timestamp, value: val ?? null };
    });
  }, [rawData, start, end, intervalMin]);

  // CSV из объединенных данных
  const csvContent = useMemo(() => {
    if (!chartData.length) return '';
    const header = ['timestamp', 'value'];
    const rows = chartData.map(d => [d.timestamp, d.value != null ? String(d.value) : '']);
    return [header, ...rows].map(r => r.join(',')).join('\n');
  }, [chartData]);

  const downloadCsv = () => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-window"
        onClick={e => e.stopPropagation()}
        style={{ position: 'relative' }}
      >
        <button className="close-button" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        <h2 className="modal-title">{title}</h2>

        <div className="modal-controls">
          <label>
            С:{' '}
            <input
              type="datetime-local"
              value={start}
              onChange={e => setStart(e.target.value)}
            />
          </label>
          <label>
            По:{' '}
            <input
              type="datetime-local"
              value={end}
              onChange={e => setEnd(e.target.value)}
            />
          </label>
          <label>
            Интервал (мин):{' '}
            <input
              type="number"
              min={1}
              value={intervalMin}
              onChange={e => setIntervalMin(Number(e.target.value))}
            />
          </label>
          <label>
            Мин. граница:{' '}
            <input
              type="text"
              value={minBound}
              onChange={e => setMinBound(e.target.value)}
              placeholder="необязательно"
            />
          </label>
          <label>
            Макс. граница:{' '}
            <input
              type="text"
              value={maxBound}
              onChange={e => setMaxBound(e.target.value)}
              placeholder="необязательно"
            />
          </label>
          <button className="csv-button" onClick={downloadCsv}>
            Скачать CSV
          </button>
        </div>

        <div className="chart-table-container">
          <ResponsiveContainer width="100%" height={500}>
            <LineChart
              data={chartData}
              style={{ backgroundColor: '#000', fontFamily: 'Roboto, sans-serif' }}
            >
              <CartesianGrid stroke="#444" />
              <XAxis
                dataKey="timestamp"
                stroke="#FFD014"
                tickFormatter={str => {
                  const d = new Date(str);
                  return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                }}
              />
              <YAxis
                stroke="#FFD014"
                axisLine={{ stroke: '#FFD014' }}
                tickLine={{ stroke: '#FFD014' }}
                tick={{ fill: '#FFD014' }}
                width={80}
                tickCount={6}
                tickFormatter={(val: number) => val.toFixed(2)}
                label={{
                  value: type === 'voltage' ? 'Вольт' : type === 'current' ? 'Ампер' : '°C',
                  angle: -90,
                  position: 'insideLeft',
                  fill: '#FFD014',
                  offset: 10,
                }}
                domain={
                  chartData.some(d => d.value !== null)
                    ? [
                        minBound !== '' ? Number(minBound) : 'auto',
                        maxBound !== '' ? Number(maxBound) : 'auto',
                      ]
                    : [0, 1]
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#000',
                  borderColor: '#FFD014',
                  fontFamily: 'Roboto, sans-serif',
                }}
                labelFormatter={l => new Date(l).toLocaleString()}
                formatter={val => {
                  const num = val == null ? NaN : Number(val);
                  return [isNaN(num) ? '—' : num.toFixed(2), ''];
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#FFD014"
                dot={dotProps => {
                  const { cx, cy, payload, index } = dotProps;
                  const key = `${payload.timestamp}-${index}`;
                  const num = payload.value == null ? NaN : Number(payload.value);
                  const isOut =
                    (minBound && !isNaN(num) && num < Number(minBound)) ||
                    (maxBound && !isNaN(num) && num > Number(maxBound));
                  if (isOut && onAlert) onAlert(payload.timestamp, num);
                  return (
                    <circle
                      key={key}
                      cx={cx}
                      cy={cy}
                      r={isOut ? 6 : 4}
                      fill={isOut ? 'red' : '#FFD014'}
                      stroke="#FFD014"
                      style={{ cursor: 'pointer' }}
                    />
                  );
                }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="data-table" style={{ height: 500, overflowY: 'auto', width: 300 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ color: '#FFD014' }}>Время</th>
                  <th style={{ color: '#FFD014' }}>Значение</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((d, i) => {
                  const num = d.value == null ? NaN : Number(d.value);
                  return (
                    <tr key={`${d.timestamp}-${i}`}>                    
                      <td style={{ color: '#FFD014' }}>
                        {new Date(d.timestamp).toLocaleString()}
                      </td>
                      <td style={{ color: '#FFD014' }}>
                        {isNaN(num) ? '—' : num.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartModal;
