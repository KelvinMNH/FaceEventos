import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ListaEventos from './pages/ListaEventos';
import CriarEvento from './pages/CriarEvento';
import ControleAcesso from './pages/ControleAcesso';
import CadastroParticipante from './pages/CadastroParticipante';
import ListaParticipantes from './pages/ListaParticipantes';
import RelatorioEvento from './pages/RelatorioEvento';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<ListaEventos />} />
        <Route path="/create" element={<CriarEvento />} />
        <Route path="/access" element={<ControleAcesso />} />
        <Route path="/register" element={<CadastroParticipante />} />
        <Route path="/participants" element={<ListaParticipantes />} />
        <Route path="/event/:id/report" element={<RelatorioEvento />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
