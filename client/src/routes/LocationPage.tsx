import React from 'react';
import { useParams, Link } from 'react-router-dom';
import ObjectList from '../components/ObjectList';

type Params = { stationId: string };

const LocationPage: React.FC = () => {
  const { stationId } = useParams<Params>();
  return (
    <div>
      <h1>Локация: {stationId}</h1>
      <Link to="/">← Главный экран</Link>
      <ObjectList />
    </div>
  );
};

export default LocationPage;
