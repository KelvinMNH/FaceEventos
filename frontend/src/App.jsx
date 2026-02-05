import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ListaEventos from './pages/ListaEventos';
import CriarEvento from './pages/CriarEvento';
import ControleAcesso from './pages/ControleAcesso';
import RelatorioEvento from './pages/RelatorioEvento';
import TotemAcesso from './pages/TotemAcesso';
import TotemSaida from './pages/TotemSaida';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ListaEventos />} />
        <Route path="/create" element={<CriarEvento />} />
        <Route path="/access" element={<ControleAcesso />} />
        <Route path="/totem" element={<TotemAcesso />} />
        <Route path="/totem-checkout" element={<TotemSaida />} />
        <Route path="/event/:id/report" element={<RelatorioEvento />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
