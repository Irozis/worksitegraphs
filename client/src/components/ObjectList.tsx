
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import { ObjectItem } from '../types';
import './ObjectList.css';

type Params = { stationId: string };

const ObjectList: React.FC = () => {
  const { stationId } = useParams<Params>();
  const navigate = useNavigate();
  const { data: objects } = useFetch<ObjectItem[]>(`/api/stations/${stationId}/objects`);

  if (!objects) return <div>Загрузка...</div>;

  return (
    <div className="object-grid">
      {objects.map(obj => (
        <div
          key={obj.id}
          className="object-card"
          onClick={() => navigate(`/object/${obj.id}`)}
        >
          <h3>{obj.name}</h3>
          <p>Ед. изм.: {obj.unit}</p>
          {obj.hasAlert && <span className="alert-icon">⚠️</span>}
        </div>
      ))}
    </div>
  );
};
export default ObjectList;
