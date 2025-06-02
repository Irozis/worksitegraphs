// client/src/routes/ObjectPage.tsx
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { ObjectItem } from '../types';
import ChartModal from '../components/ChartModal';

// 1) Сразу объявляем эту кортеж-литералу, чтобы TypeScript знал точные значения.
const METRICS = ['voltage', 'current', 'temperature'] as const;
// Тип METRIC будет именно одна из трёх строк:
type Metric = typeof METRICS[number];

type Params = { objectId: string };

const ObjectPage: React.FC = () => {
  const { objectId } = useParams<Params>();
  const navigate = useNavigate();
  const { data: object } = useFetch<ObjectItem>(`/api/objects/${objectId}`);

  // 2) Стейт типизируем строго под наши три метрики или null
  const [activeMetric, setActiveMetric] = useState<Metric | null>(null);

  if (!object) return <div>Загрузка...</div>;

  return (
    <div style={{ fontFamily: 'Roboto', padding: 20, }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: '16px',
          background: 'transparent',
          border: '1px solid #FFD014',
          borderRadius: '4px',
          color: '#FFD014',
          padding: '8px 12px',
          cursor: 'pointer',
          marginTop: '50px'
        }}
      >
        ← Назад
      </button>
      <h1 style={{  fontFamily: 'Roboto' , color: '#FFD014'}}>{object.name}</h1>
      <p style={{ fontFamily: 'Roboto' , color: '#FFD014'}}>{object.description}</p>

      <div style={{ display: 'flex', gap: 16, marginTop: 24 }}>
        {METRICS.map(metric => (
          <div
            key={metric}
            onClick={() => setActiveMetric(metric)}  // metric уже тип Metric
            style={{
              flex: 1,
              background: '#252525',
              fontFamily: 'Roboto',
              color: '#FFD014',
              padding: 8,
              border: '1px solid #FFD014',
              borderRadius: 8,
              cursor: 'pointer',
              position: 'relative',
              textAlign: 'center'
            }}
          >
            <h3>
              {metric === 'voltage' ? 'Напряжение'
               : metric === 'current' ? 'Ток'
               : 'Температура'}
            </h3>
          </div>
        ))}
      </div>

      {/* 3) Передаём в ChartModal именно Metric, а не string */}
      {activeMetric && (
        <ChartModal
          type={activeMetric}        // здесь больше не будет `string`
          objectId={Number(objectId)}
          onClose={() => setActiveMetric(null)}
          onAlert={() => {/* ... */}}
          visible={true}
        />
      )}
    </div>
  );
};

export default ObjectPage;
