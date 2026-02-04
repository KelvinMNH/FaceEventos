import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import EventList from './pages/EventList';
import CreateEvent from './pages/CreateEvent';
import AccessControl from './pages/AccessControl';

import EventReport from './pages/EventReport';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<EventList />} />
        <Route path="/create" element={<CreateEvent />} />
        <Route path="/access" element={<AccessControl />} />
        <Route path="/event/:id/report" element={<EventReport />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
