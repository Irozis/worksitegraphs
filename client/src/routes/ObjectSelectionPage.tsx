import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { ObjectItem } from '../types';

// Тип параметров URL
type Params = { stationName: string };

const ObjectSelectionPage: React.FC = () => {
  const { stationName } = useParams<Params>();
  const navigate = useNavigate();

  // Если stationName не указан, можно показать ошибку или перенаправить
  if (!stationName) {
    return (
      <div style={{ fontFamily: 'Roboto, sans-serif', color: '#FFD014', padding: 20, backgroundColor: '#000' }}>
        Ошибка: станция не указана
      </div>
    );
  }

  const { data: objects } = useFetch<ObjectItem[]>(
    `/api/stations/${encodeURIComponent(stationName)}/objects`
  );

  if (!objects) {
    return (
      <div style={{ fontFamily: 'Roboto, sans-serif', color: '#FFD014', padding: 20, backgroundColor: '#000' }}>
        Загрузка...
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: 'Roboto, sans-serif',
      backgroundColor: '#252525',
      minHeight: '100vh',
      padding: '20px',
      color: '#FFD014',
      marginTop: '50px',
    }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: '16px',
          background: 'transparent',
          border: '1px solid #FFD014',
          borderRadius: '4px',
          color: '#FFD014',
          padding: '8px 12px',
          cursor: 'pointer'
        }}
      >
        ← Назад
      </button>
      <h1 style={{ marginBottom: '16px' }}>Объекты станции: {stationName}</h1>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {objects.map(obj => (
          <div
            key={obj.id}
            onClick={() => navigate(`/object/${obj.id}`)}
            style={{
              backgroundColor: '#252525',
              border: '1px solid #FFD014',
              borderRadius: '8px',
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '100%'
            }}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>{obj.name}</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', flexGrow: 1 }}>{obj.description}</p>
            {obj.hasAlert && <span style={{ color: 'red', marginTop: '8px' }}>⚠️ Тревога</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ObjectSelectionPage;
