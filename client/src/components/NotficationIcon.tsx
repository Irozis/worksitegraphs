import React from 'react';

interface Props { hasAlert: boolean; }
const NotificationIcon: React.FC<Props> = ({ hasAlert }) => (
  hasAlert ? <span style={{ color: 'red' }}>⚠️</span> : null
);
export default NotificationIcon;