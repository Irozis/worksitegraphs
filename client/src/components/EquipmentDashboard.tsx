import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface Equipment {
  id: number;
  name: string;
  unit: string;
  location: string;
}
interface DataPoint {
  timestamp: string;
  value: number;
}

const EquipmentDashboard: React.FC = () => {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [data, setData] = useState<DataPoint[]>([]);
  // Срез последних 60 точек данных для отображения
  const recentData = data.slice(-60);

  // Загрузка списка оборудования
  useEffect(() => {
    fetch('/api/equipment')
      .then(res => res.json())
      .then((list: Equipment[]) => {
        console.log('equipment list:', list);
        setEquipmentList(list);
        if (list.length) setSelectedEquipment(list[0]);
      })
      .catch(err => console.error('Error loading equipment list', err));
  }, []);

  // Загрузка данных и обновление каждые 60 секунд
  useEffect(() => {
    if (!selectedEquipment) return;
    const fetchData = () => {
      fetch(`/api/equipment/${selectedEquipment.id}/data`)
        .then(res => res.json())
        .then((points: DataPoint[]) => {
          console.log(`data for equipment ${selectedEquipment.id}:`, points);
          setData(points);
        })
        .catch(err => console.error('Error loading data points', err));
    };
    fetchData();
    const intervalId = setInterval(fetchData, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [selectedEquipment]);

  if (!selectedEquipment) {
    return <div>Загрузка...</div>;
  }

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{fontFamily: 'Roboto, white, bold'}}>Оборудование: {selectedEquipment.name}</h1>
      <p>Единица: {selectedEquipment.unit} | Локация: {selectedEquipment.location}</p>
      <select
        value={selectedEquipment.id}
        onChange={e => {
          const eq = equipmentList.find(eq => eq.id === +e.target.value);
          if (eq) setSelectedEquipment(eq);
        }}
      >
        {equipmentList.map(eq => (
          <option key={eq.id} value={eq.id}>{eq.name}</option>
        ))}
      </select>
      <div style={{ display: 'flex', gap: 24, marginTop: '10px' }}>
        <LineChart
          width={1500}
          height={700}
          data={recentData.map(d => ({ ...d, timestamp: new Date(d.timestamp).toLocaleString() }))}
          style={{backgroundColor: '#252525'}}
        >
          <CartesianGrid strokeDasharray="0 0" />
          <XAxis dataKey="timestamp" stroke='white' strokeWidth={2} fontFamily='14px, bold, Roboto, black,'/>
          <YAxis stroke='white' strokeWidth={2} fontFamily='Roboto, black, bold' label={{ value: selectedEquipment.unit, angle: -90, position: 'insideLeft' }} />
          <Tooltip wrapperStyle={{backgroundColor: 'black', borderColor: 'black'}}  contentStyle={{ backgroundColor:'#252525', border:'2px solid #ffd014', fontFamily:'Roboto, bold, white'  }}/>
          <Legend wrapperStyle={{color: 'black'}}/>
          <Line type="monotone" stroke='#FFD014' dataKey="value" name={selectedEquipment.name} dot={false} strokeWidth={2}/>
        </LineChart>
        <table style={{ borderCollapse: 'collapse', width: 300, fontFamily:'Roboto', color:'white' }}>
          <thead>
            <tr>
              <th style={{ border: '2px solid black', padding: 8, backgroundColor: '#FFD014', color: 'black'}}>Время</th>
              <th style={{ border: '2px solid black', padding: 8, backgroundColor: '#FFD014', color: 'black' }}>Значение ({selectedEquipment.unit})</th>
            </tr>
          </thead>
          <tbody>
            {recentData.map((d, i) => (
              <tr key={i}>
                <td style={{ border: '2px solid #ddd', padding: 8,  fontFamily:'Roboto, white, bold'  }}>{new Date(d.timestamp).toLocaleString()}</td>
                <td style={{ border: '2px solid #ddd', padding: 8, fontFamily:'Roboto, white, bold' }}>{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EquipmentDashboard;