# UniEventos 🏢🎫

Sistema moderno de gestão de eventos e controle de acesso biométrico para hospitais e centros de convenções.

## 🚀 Sobre o Projeto

O **UniEventos** é uma plataforma robusta projetada para gerenciar fluxos de entrada e saída em eventos de grande escala. O sistema utiliza tecnologia biométrica para garantir a identidade dos participantes e oferece dashboards em tempo real para os organizadores.

### ✨ Principais Funcionalidades

*   **Painel Administrativo**: Criação e gestão de eventos com suporte a múltiplos formatos de imagem.
*   **Controle de Acesso Biométrico**: Interface dedicada para recepção com feedback visual instantâneo.
*   **Totens de Autoatendimento**: Telas otimizadas para totens de entrada (Check-in) e saída (Checkout).
*   **Relatórios e Estatísticas**: Gráficos demográficos (gênero, faixa etária) e logs detalhados de presença.
*   **Suporte Multi-Banco**: Compatível com **SQLite** (desenvolvimento) e **Oracle Database** (produção).
*   **Gestão de Acompanhantes**: Controle flexível de acompanhantes por participante.

---

## 🏗️ Arquitetura do Sistema

O projeto utiliza uma arquitetura modularizada para facilitar a manutenção:

*   **`/backend`**: API RESTful desenvolvida com Node.js, Express e Sequelize (Arquitetura MVC).
*   **`/frontend`**: Aplicação SPA construída com React, Vite e componentes estilizados modernos.
*   **`/bridge`**: Camada de integração técnica para hardware biométrico (Futronic).

---

## 🚦 Como Iniciar

### Pré-requisitos
*   Node.js (v18+)
*   NPM ou Yarn

### 1. Backend
```bash
cd backend
npm install
node server.js
```
*Configuração via `.env` (Ver README interno do backend).*

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
*Acesse em: `http://localhost:5173`*

---

## ⚙️ Configuração de Produção (Oracle)

O sistema está pronto para produção. Para migrar do SQLite para o Oracle:
1. Altere o arquivo `backend/.env`.
2. Configure `DB_DIALECT=oracle`.
3. Preencha as credenciais do seu servidor Oracle.

---

## 📄 Licença

Este projeto é de uso exclusivo para fins corporativos/acadêmicos da UniEventos.

---
Desenvolvido com ❤️ pela equipe UniEventos.
