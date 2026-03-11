import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import ListaEventos from './pages/ListaEventos';
import CriarEvento from './pages/CriarEvento';
import ControleAcesso from './pages/ControleAcesso';
import RelatorioEvento from './pages/RelatorioEvento';
import TotemAcesso from './pages/TotemAcesso';
import TotemSaida from './pages/TotemSaida';

import GerenciarParticipantes from './pages/GerenciarParticipantes';

// Componente para proteger rotas privadas
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Carregando...</div>;
  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <PrivateRoute>
              <ListaEventos />
            </PrivateRoute>
          } />

          <Route path="/create" element={
            <PrivateRoute>
              <CriarEvento />
            </PrivateRoute>
          } />

          <Route path="/access" element={
            <PrivateRoute>
              <ControleAcesso />
            </PrivateRoute>
          } />

          <Route path="/totem/:id" element={
            <PrivateRoute>
              <TotemAcesso />
            </PrivateRoute>
          } />

          <Route path="/totem-checkout/:id" element={
            <PrivateRoute>
              <TotemSaida />
            </PrivateRoute>
          } />

          <Route path="/event/:id/report" element={
            <PrivateRoute>
              <RelatorioEvento />
            </PrivateRoute>
          } />

          <Route path="/admin/participantes" element={
            <PrivateRoute>
              <GerenciarParticipantes />
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
