# UniEventos

Sistema moderno de gestão de eventos e controle de acesso biométrico.

## 🚀 Pré-requisitos para Instalação

Antes de começar em um **novo computador**, certifique-se de ter instalado:

1.  **Node.js (v18 ou superior)**: [Baixar aqui](https://nodejs.org/).
2.  **Git**: Para clonar o repositório.
3.  **Drivers do Leitor Futronic FS80H**:
    *   Instale o driver USB oficial da Futronic.
    *   **Importante**: O arquivo `ftrScanAPI.dll` deve estar presente na pasta `bridge/`. (Já incluído no projeto, mas verifique se o antivírus não removeu).
4.  **Visual C++ Redistributable**: Necessário para módulos nativos do Node.js.

---

## 📦 Instalação Passo a Passo

Abra o terminal na pasta raiz do projeto (`UniEventos`) e execute os comandos para cada módulo.

### 1. Configurar o Backend (API)
O backend gerencia o banco de dados e as regras de negócio.

```bash
cd backend
npm install
```
*Crie um arquivo `.env` na pasta `backend` se necessário (ver modelo).*

### 2. Configurar o Frontend (Interface)
A interface visual onde os usuários interagem.

```bash
cd ../frontend
npm install
```

### 3. Configurar a Bridge (Biometria)
O software que conecta o leitor USB ao navegador.

```bash
cd ../bridge
npm install
```

---

## ▶️ Como Rodar o Projeto

Você precisará de **3 terminais** abertos simultaneamente (ou abas do VS Code).

### Terminal 1: Backend
```bash
cd backend
node server.js
```
*Aguarde aparecer: "Servidor rodando na porta 3000"*

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
*Acesse o link mostrado (geralmente `http://localhost:5173`)*

### Terminal 3: Bridge Biométrica
⚠️ **Conecte o leitor biométrico USB antes de rodar.**

```bash
cd bridge
node connector_futronic.js
```
*Deve aparecer: "Bridge conectada" e "Leitor Conectado".*

---

## 🛠️ Solução de Problemas Comuns

### 🔴 Erro: "Leitor não encontrado" ou "Bridge desconectada"
1.  Verifique se o leitor USB está bem conectado.
2.  Reinicie o comando no Terminal 3.
3.  Verifique no Gerenciador de Dispositivos se o driver "Futronic" está instalado corretamente.

### ⚪ Tela Branca no Frontend
1.  Verifique se o Backend (Terminal 1) está rodando.
2.  Abra o Console do Desenvolvedor (F12) para ver erros específicos.

### 💾 Banco de Dados
Por padrão, o sistema usa **SQLite** (`database.sqlite`).
Para resetar o banco, basta apagar o arquivo `database.sqlite` e reiniciar o backend.

---

## 👤 Login Padrão
Se o banco estiver vazio, crie um usuário via API ou registre-se na tela inicial (se habilitado).
*   **Admin Padrão**: (Não configurado por padrão, necessário criar no primeiro uso).
