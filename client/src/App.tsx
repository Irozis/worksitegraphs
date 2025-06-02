import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header               from './components/Header';
import MainScreen           from './routes/MainScreen';
import ObjectSelectionPage  from './routes/ObjectSelectionPage';
import ObjectPage           from './routes/ObjectPage';
import ObjectInfoPage       from './routes/ObjectInfoPage';

const App: React.FC = () => (
  <>
    <Header />
    <div style={{ paddingTop: 100 }}>
      <Routes>
        <Route path="/"                            element={<MainScreen />} />
        <Route path="/location/:stationName/select" element={<ObjectSelectionPage />} />
        <Route path="/object/:objectId"            element={<ObjectPage />} />
        <Route path="/object/:objectId/info"       element={<ObjectInfoPage />} />
      </Routes>
    </div>
  </>
);

export default App;
