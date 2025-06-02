import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import ExportButton from '../components/ExportButton';
import { ObjectItem } from '../types';

type Params = { objectId: string };

const ObjectInfoPage: React.FC = () => {
  const { objectId } = useParams<Params>();
  const navigate = useNavigate();
  const { data: object } = useFetch<ObjectItem>(`/api/objects/${objectId}`);

  if (!object) return <div>Загрузка...</div>;

  return (
    <div>
      <button onClick={() => navigate(-1)}>← К объекту</button>
      <h1>{object.name}</h1>
      {object.photoUrl && <img src={object.photoUrl} alt={object.name} width={200} />}
      <p><strong>Номер:</strong> {object.id}</p>
      <p><strong>Локация:</strong> {object.location}</p>
      <p><strong>Описание:</strong> {object.description}</p>
      <p><strong>Дата создания:</strong> {new Date(object.createdAt).toLocaleDateString()}</p>
      <ExportButton objectId={Number(objectId)} />
    </div>
  );
};

export default ObjectInfoPage;
