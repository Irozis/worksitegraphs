import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Station } from '../types';
import useFetch from '../hooks/useFetch';

const StationList: React.FC = () => {
  const { data: stations } = useFetch<Station[]>('/api/stations');
  return (
    <ul>
      {stations?.map(s => (
        <li style={{textAlign: 'center'}} key={s.id}>
          <Link to={`/location/${s.id}`}>{s.name}</Link>
          {s.hasAlert && <span>⚠️</span>}
        </li>
      ))}
    </ul>
  );
};

export default StationList;