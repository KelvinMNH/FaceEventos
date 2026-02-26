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

## 📦 Instalação e Execução

### Passo 1: Instalar Dependências

Abra o terminal na pasta raiz do projeto (`UniEventos`) e instale as dependências de cada módulo:

```bash
# Backend (API)
cd backend
npm install

# Frontend (Interface)
cd ../frontend
npm install

# Bridge (Biometria)
cd ../bridge
npm install
```

*Opcional: Crie um arquivo `.env` na pasta `backend` se necessário.*

---

### Passo 2: Rodar o Projeto

⚠️ **Conecte o leitor biométrico USB antes de iniciar.**

#### Método Rápido (Recomendado)
Execute o script que inicia tudo automaticamente:
```bash
iniciar-servidores.bat
```

#### Método Manual (Alternativa)
Abra **3 terminais** e execute em cada um:

**Terminal 1 - Backend:**
```bash
cd backend
node server.js
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Bridge:**
```bash
cd bridge
node connector_futronic.js
```

**Acesse:** `http://localhost:5173`

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

---

**Software de autoria de Kelvin Higino**  
Para contato, acesse: 🌐 [kelvinti.pages.dev](https://kelvinti.pages.dev)
