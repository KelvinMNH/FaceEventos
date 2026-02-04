# UniEventos - Sistema de Controle de Acesso Biométrico

Este projeto é um protótipo funcional composto por Backend, Frontend e Bridge Biométrica.

## Estrutura do Projeto

- **backend/**: API REST em Node.js com SQLite.
- **frontend/**: Aplicação React (Vite) para dashboard e visualização.
- **bridge/**: Scripts para simulação (e futura integração) do leitor Futronic.

## Como Rodar

### 1. Iniciar o Backend
Terminal 1:
```bash
cd backend
npm install (se ainda não fez)
node server.js
```
O servidor rodará em `http://localhost:3000`.

### 2. Iniciar o Frontend
Terminal 2:
```bash
cd frontend
npm install (se ainda não fez)
npm run dev
```
Acesse `http://localhost:5173`.

### 3. Simular Leitura Biométrica (Bridge)
Terminal 3:
```bash
cd bridge
# Teste com usuário cadastrado (Kelvin)
node scanner_sim.js bio_kelvin_123

# Teste com biometria desconhecida
node scanner_sim.js bio_errada
```

## Funcionalidades Implementadas
- Validação de entrada via API.
- Dashboard em tempo real (Polling).
- Modal de feedback visual ao receber novo acesso.
- Banco de dados SQLite com dados iniciais (Seed).
