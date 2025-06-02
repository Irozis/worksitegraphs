import React from 'react';
import { ObjectItem } from '../types';

interface Props { object: ObjectItem; }
const ObjectCard: React.FC<Props> = ({ object }) => (
  <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8 }}>
    <h2>{object.name}</h2>
    <p>{object.description}</p>
    <p><em>Создан: {new Date(object.createdAt).toLocaleDateString()}</em></p>
    {/* другие метаданные */}
  </div>
);

export default ObjectCard;