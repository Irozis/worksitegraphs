import React from 'react';
import { useNavigate } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { Station } from '../types';

const MainScreen: React.FC = () => {
  const navigate = useNavigate();
  const { data: stations } = useFetch<Station[]>('/api/stations');

  if (!stations) {
    return <div style={{ fontFamily: 'Roboto, sans-serif', color: '#FFD014', textAlign: 'center' }}>Загрузка...</div>;
  }

  return (
    <div style={{
      fontFamily: 'Roboto, sans-serif',
      backgroundColor: '#252525',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px',
      color: '#FFD014',
      textAlign: 'center'
    }}>
      <h1 style={{ marginBottom: '16px' }}>Станции</h1>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        justifyContent: 'center'
      }}>
        {stations.map(st => (
          <div
            key={st.name}
            onClick={() => navigate(`/location/${encodeURIComponent(st.name)}/select`)}
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
            <h2 style={{ margin: '0 0 8px', fontSize: '1.25rem' }}>{st.name}</h2>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              {st.hasAlert ? '⚠️ Есть тревога' : 'Тревог нет'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MainScreen;