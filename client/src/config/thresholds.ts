// File: client/src/config/thresholds.ts
export type Metric = 'voltage' | 'current' | 'temperature';

export interface Threshold {
  min: number;
  max: number;
}

// Здесь задаем стандартные пороги для трёх метрик:
export const thresholds: Record<Metric, Threshold> = {
  voltage:     { min: 210,  max: 230 },  // Вольт
  current:     { min:   2,  max:   8 },  // Ампер
  temperature: { min:  18,  max:  30 },  // °C
};
