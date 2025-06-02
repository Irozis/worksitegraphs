import React from 'react';

interface Props { objectId: number; }
const ExportButton: React.FC<Props> = ({ objectId }) => {
  const handleExport = () => {
    window.open(`/api/objects/${objectId}/export`);
  };
  return <button onClick={handleExport}>Скачать данные</button>;
};
export default ExportButton;