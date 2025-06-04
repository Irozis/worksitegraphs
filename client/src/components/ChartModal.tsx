// File: client/src/components/ChartModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { thresholds as defaultThresholds } from '../../config/thresholds';
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

// type Metric = 'voltage' | 'current' | 'temperature';
// Metric type is already imported from thresholds.ts or can be defined locally if not.
// For now, we'll use the one defined in thresholds.ts via defaultThresholds.
type Metric = keyof typeof defaultThresholds;

interface ChartMetricState {
  rawData: { timestamp: string; value: number }[] | undefined;
  chartData: DataPoint[];
  minBound: string;
  maxBound: string;
}

interface SensorIdState {
  temperature: number | null;
  current: number | null;
  voltage: number | null;
}

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
  // const title = titleMap[type]; // Removed as each chart will have its own title

  const yAxisLabelMap: Record<Metric, string> = {
    voltage: 'Вольт',
    current: 'Ампер',
    temperature: '°C',
  };

  const metricsToRender: Metric[] = ['temperature', 'current', 'voltage'];

  // Параметры диапазона
  const now = new Date();
  const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 16);

  const [start, setStart] = useState<string>(fmt(ago2ah));
  const [end, setEnd] = useState<string>(fmt(now));
  const [intervalMin, setIntervalMin] = useState<number>(5);
  const [refreshKey, setRefreshKey] = useState(Date.now());

  const [sensorIds, setSensorIds] = useState<SensorIdState>({ temperature: null, current: null, voltage: null });
  const [sensorIdsLoading, setSensorIdsLoading] = useState(true);

  const initialMetricsData: Record<Metric, ChartMetricState> = {
    temperature: {
      rawData: undefined,
      chartData: [],
      minBound: defaultThresholds.temperature.min.toString(),
      maxBound: defaultThresholds.temperature.max.toString(),
    },
    current: {
      rawData: undefined,
      chartData: [],
      minBound: defaultThresholds.current.min.toString(),
      maxBound: defaultThresholds.current.max.toString(),
    },
    voltage: {
      rawData: undefined,
      chartData: [],
      minBound: defaultThresholds.voltage.min.toString(),
      maxBound: defaultThresholds.voltage.max.toString(),
    },
  };

  const [metricsData, setMetricsData] = useState<Record<Metric, ChartMetricState>>(initialMetricsData);
  // const [minBound, setMinBound] = useState<string>(''); // Replaced by metricsData
  // const [maxBound, setMaxBound] = useState<string>(''); // Replaced by metricsData

  // --- Effect to fetch associated sensor IDs ---
  useEffect(() => {
    if (visible && objectId) {
      setSensorIdsLoading(true);
      fetch(`/api/station-sensors-by-object/${objectId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Failed to fetch sensor IDs: ${res.status}`);
          }
          return res.json();
        })
        .then((data: { temperatureSensorId: number | null; voltageSensorId: number | null; currentSensorId: number | null }) => {
          setSensorIds({
            temperature: data.temperatureSensorId,
            current: data.currentSensorId,
            voltage: data.voltageSensorId,
          });
        })
        .catch(error => {
          console.error("Error fetching sensor IDs:", error);
          setSensorIds({ temperature: null, current: null, voltage: null }); // Reset on error
        })
        .finally(() => {
          setSensorIdsLoading(false);
        });
    } else if (!visible) {
      // Reset when modal is hidden
      setSensorIds({ temperature: null, current: null, voltage: null });
      setSensorIdsLoading(true);
    }
  }, [objectId, visible]);

  // --- Polling useEffect for data refresh ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined = undefined;

    if (visible) {
      // Optionally trigger an immediate refresh when modal becomes visible if not relying on initial load by other params
      // setRefreshKey(Date.now()); // This might cause a double fetch if other params also change on visible

      intervalId = setInterval(() => {
        setRefreshKey(Date.now());
      }, 60000); // 60 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [visible]);

  // --- Data Fetching for each metric ---
  const commonQueryParams = `start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&intervalMinutes=${intervalMin}&_cb=${refreshKey}`;

  // Fetch data only if the specific sensor ID is available
  const { data: tempData } = useFetch<{ timestamp: string; value: number }[]>(
    sensorIds.temperature ? `/api/objects/${sensorIds.temperature}/data?type=temperature&${commonQueryParams}` : null
  );
  const { data: currentData } = useFetch<{ timestamp: string; value: number }[]>(
    sensorIds.current ? `/api/objects/${sensorIds.current}/data?type=current&${commonQueryParams}` : null
  );
  const { data: voltageData } = useFetch<{ timestamp: string; value: number }[]>(
    sensorIds.voltage ? `/api/objects/${sensorIds.voltage}/data?type=voltage&${commonQueryParams}` : null
  );

  // --- Update rawData in metricsData state when fetched data changes ---
  // Reset rawData if sensorId becomes null (e.g. modal hidden, then shown with different objectId)
  useEffect(() => {
    if (!sensorIds.temperature) {
      setMetricsData(prev => ({...prev, temperature: { ...prev.temperature, rawData: undefined, chartData: [] }}));
    }
  }, [sensorIds.temperature]);

  useEffect(() => {
    if (!sensorIds.current) {
      setMetricsData(prev => ({...prev, current: { ...prev.current, rawData: undefined, chartData: [] }}));
    }
  }, [sensorIds.current]);

  useEffect(() => {
    if (!sensorIds.voltage) {
      setMetricsData(prev => ({...prev, voltage: { ...prev.voltage, rawData: undefined, chartData: [] }}));
    }
  }, [sensorIds.voltage]);

  useEffect(() => {
    if (tempData) {
      setMetricsData(prev => ({
        ...prev,
        temperature: { ...prev.temperature, rawData: tempData },
      }));
    }
  }, [tempData]);

  useEffect(() => {
    if (currentData) {
      setMetricsData(prev => ({
        ...prev,
        current: { ...prev.current, rawData: currentData },
      }));
    }
  }, [currentData]);

  useEffect(() => {
    if (voltageData) {
      setMetricsData(prev => ({
        ...prev,
        voltage: { ...prev.voltage, rawData: voltageData },
      }));
    }
  }, [voltageData]);

  // --- Chart Data Processing for each metric ---
  const processMetricData = (
    metricRawData: { timestamp: string; value: number }[] | undefined,
    currentStart: string,
    currentEnd: string,
    currentIntervalMin: number
  ): DataPoint[] => {
    if (!currentStart || !currentEnd || !metricRawData) return []; // Changed rawData to metricRawData
    const startDate = new Date(currentStart);
    const endDate = new Date(currentEnd);
    const timeline: DataPoint[] = [];

    for (
      let cursor = new Date(startDate);
      cursor <= endDate;
      cursor = new Date(cursor.getTime() + currentIntervalMin * 60 * 1000)
    ) {
      timeline.push({ timestamp: cursor.toISOString(), value: null });
    }

    const map = new Map<string, number>();
    metricRawData.forEach(d => { // Changed rawData to metricRawData
      const dt = new Date(d.timestamp);
      dt.setSeconds(0, 0); // Normalize to minute start
      map.set(dt.toISOString(), d.value);
    });

    return timeline.map(pt => {
      const val = map.get(pt.timestamp);
      return { timestamp: pt.timestamp, value: val ?? null };
    });
  };

  // useEffect for Temperature chart data
  useEffect(() => {
    const processedChartData = processMetricData(metricsData.temperature.rawData, start, end, intervalMin);
    setMetricsData(prev => ({
      ...prev,
      temperature: { ...prev.temperature, chartData: processedChartData },
    }));
  }, [metricsData.temperature.rawData, start, end, intervalMin]);

  // useEffect for Current chart data
  useEffect(() => {
    const processedChartData = processMetricData(metricsData.current.rawData, start, end, intervalMin);
    setMetricsData(prev => ({
      ...prev,
      current: { ...prev.current, chartData: processedChartData },
    }));
  }, [metricsData.current.rawData, start, end, intervalMin]);

  // useEffect for Voltage chart data
  useEffect(() => {
    const processedChartData = processMetricData(metricsData.voltage.rawData, start, end, intervalMin);
    setMetricsData(prev => ({
      ...prev,
      voltage: { ...prev.voltage, chartData: processedChartData },
    }));
  }, [metricsData.voltage.rawData, start, end, intervalMin]);

  const handleThresholdChange = (metric: Metric, boundType: 'min' | 'max', value: string) => {
    setMetricsData(prev => ({
      ...prev,
      [metric]: {
        ...prev[metric],
        [boundType === 'min' ? 'minBound' : 'maxBound']: value,
      },
    }));
  };

  // CSV из объединенных данных - uses 'type' prop to select which metric to export
  // This part might need rethinking if 'type' prop is fully deprecated.
  // For now, it uses the original 'type' prop to select one of the three metrics.
  const csvContent = useMemo(() => {
    // If sensorIdsLoading is true, or the specific sensorId for 'type' is null, don't generate CSV
    if (sensorIdsLoading || !sensorIds[type]) {
        return '';
    }
    const currentMetricChartData = metricsData[type]?.chartData;
    if (!currentMetricChartData || !currentMetricChartData.length) return '';
    const header = ['timestamp', 'value'];
    const rows = currentMetricChartData.map(d => [d.timestamp, d.value != null ? String(d.value) : '']);
    return [header, ...rows].map(r => r.join(',')).join('\n');
  }, [metricsData, type, start, end, sensorIds, sensorIdsLoading]);

  const downloadCsv = () => {
    if (sensorIdsLoading || !sensorIds[type]) {
        alert("Данные для выбранного типа CSV еще загружаются или отсутствуют.");
        return;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Use the specific sensor ID in the filename if available, otherwise fallback to type
    const objectIdForFilename = sensorIds[type] || type;
    a.download = `object_${objectIdForFilename}_${start}_${end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-window"
        onClick={e => e.stopPropagation()}
        // style={{ position: 'relative' }} // Moved to CSS
      >
        <button className="close-button" onClick={onClose} aria-label="Закрыть">
          ×
        </button>

        {/* <h2 className="modal-title">{title}</h2> Removed */}

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
          <button className="csv-button" onClick={downloadCsv}>
            Скачать CSV
          </button>
        </div>

        <div className="main-content-area"> {/* New parent container for charts and table */}
          <div className="all-charts-area">
            {sensorIdsLoading && <div style={{textAlign: 'center', color: '#aaa', padding: '20px'}}>Загрузка идентификаторов датчиков...</div>}
            {!sensorIdsLoading && metricsToRender.map(metricKey => {
              const currentMetricData = metricsData[metricKey];
              const specificSensorId = sensorIds[metricKey];
              // Show "No Data" if the specific sensor ID wasn't found OR if chartData is empty/all nulls
              const noData = !specificSensorId || currentMetricData.chartData.every(pt => pt.value === null) || currentMetricData.chartData.length === 0;

              return (
                <div key={metricKey} className="chart-wrapper">
                  <h3>{titleMap[metricKey]} {specificSensorId ? `(ID: ${specificSensorId})` : '(ID не найден)'}</h3>
                  <div className="metric-controls">
                    <label>
                      Мин:{' '}
                      <input
                        type="text"
                        value={currentMetricData.minBound}
                        onChange={e => handleThresholdChange(metricKey, 'min', e.target.value)}
                        placeholder="авто"
                      />
                    </label>
                    <label>
                      Макс:{' '}
                      <input
                        type="text"
                        value={currentMetricData.maxBound}
                        onChange={e => handleThresholdChange(metricKey, 'max', e.target.value)}
                        placeholder="авто"
                      />
                    </label>
                  </div>
                  <div style={{ position: 'relative', width: '100%', height: 300 }}>
                    {noData && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#aaa',
                        fontSize: '16px',
                        textAlign: 'center',
                        zIndex: 10, // Ensure it's above chart grid
                      }}>
                        {!specificSensorId ? 'Датчик не найден для этого объекта' : 'Нет данных за выбранный период'}
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={currentMetricData.chartData}
                      // style={{ backgroundColor: '#000', fontFamily: 'Roboto, sans-serif' }} // Moved to CSS (or default)
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
                          value: yAxisLabelMap[metricKey],
                          angle: -90,
                          position: 'insideLeft',
                          fill: '#FFD014',
                          offset: 10,
                        }}
                        domain={(() => {
                          const dataExists = currentMetricData.chartData.some(d => d.value !== null);
                          if (!dataExists) {
                            return [0, 1]; // Default domain if no actual data points
                          }

                          const minBound = currentMetricData.minBound;
                          const maxBound = currentMetricData.maxBound;

                          let domainMin: number | 'auto' = 'auto';
                          let domainMax: number | 'auto' = 'auto';

                          if (minBound !== '' && !isNaN(Number(minBound))) {
                            domainMin = Number(minBound);
                          }
                          if (maxBound !== '' && !isNaN(Number(maxBound))) {
                            domainMax = Number(maxBound);
                          }

                          return [domainMin, domainMax];
                        })()}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#000',
                          borderColor: '#FFD014',
                          fontFamily: 'Roboto, sans-serif',
                        }}
                        labelFormatter={l => new Date(l).toLocaleString()}
                        formatter={(value, name, props) => { // props gives access to payload
                          const num = value == null ? NaN : Number(value);
                          return [isNaN(num) ? '—' : num.toFixed(2), yAxisLabelMap[metricKey]];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#FFD014"
                        dot={dotProps => {
                          const { cx, cy, payload, index } = dotProps;
                          const key = `${payload.timestamp}-${index}-${metricKey}`;
                          const num = payload.value == null ? NaN : Number(payload.value);
                          const isOut =
                            (currentMetricData.minBound && !isNaN(num) && num < Number(currentMetricData.minBound)) ||
                            (currentMetricData.maxBound && !isNaN(num) && num > Number(currentMetricData.maxBound));
                          if (isOut && onAlert) {
                             onAlert(payload.timestamp, num);
                          }
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
                        connectNulls // This is equivalent to connectNulls={true}
                        name={yAxisLabelMap[metricKey]}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  </div> {/* Closes the div style={{ position: 'relative'...}} */}
                </div>
              );
            })}
          </div>

          <div className="data-table-wrapper"> {/* New wrapper for the data table */}
            <div className="data-table"> {/* Removed inline styles */}
              <h4>Data for: {titleMap[type]} (Fallback)</h4>
              <table>
                <thead>
                <tr>
                  <th style={{ color: '#FFD014' }}>Время</th>
                  <th style={{ color: '#FFD014' }}>Значение</th>
                </tr>
              </thead>
              <tbody>
                {metricsData[type].chartData.map((d, i) => { // Display table data for the metric specified by 'type' prop
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
