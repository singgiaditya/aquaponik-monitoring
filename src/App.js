import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './dashboard';
import SensorDetail from './sensorDetail';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/sensor/:sensorType" element={<SensorDetail />} />
      </Routes>
    </Router>
  );
}

export default App;
