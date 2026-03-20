# UniEventos

Sistema profissional de gestão de eventos e controle de acesso com **Reconhecimento Facial** e Biometria.

---

## 🚀 Tecnologias
- **Backend**: Node.js, Express, Sequelize (SQLite/PostgreSQL/Oracle)
- **Frontend**: React, Vite, face-api.js, react-webcam
- **Bridge**: Serviço local em Node.js para integração com hardware Futronic (Opcional)

---

## 📦 Instalação e Execução

### 1. Pré-requisitos
- **Node.js**: v18 ou superior.
- **Webcam**: Necessária para o reconhecimento facial.
- **Leitor Futronic FS80H (Opcional)**: Caso utilize biometria digital.

### 2. Instalação das Dependências
Execute o comando abaixo na pasta raiz para instalar as dependências de todos os módulos:
```bash
# Na raiz do projeto /UniEventos
cd backend && npm install
cd ../frontend && npm install
cd ../bridge && npm install
```

### 3. Execução Rápida
Utilize o script de inicialização interativo para rodar todo o ecossistema:
```bash
iniciar-servidores.bat
```
*Este script permite reiniciar os servidores rapidamente pressionando a tecla **R**.*

---

## 🛠️ Reconhecimento Facial (Nova Funcionalidade)
O sistema agora utiliza a webcam para identificação em tempo real.
- **Cadastro**: Realizado na tela de Gerenciamento de Participantes.
- **Identificação**: Automática nos totens de acesso e saída.
- **Vantagem**: Elimina a necessidade de hardware proprietário em muitos casos.

---

## 💾 Banco de Dados
O sistema utiliza **SQLite** por padrão (`database.sqlite`).
- Para resetar os dados, exclua o arquivo `.sqlite` e reinicie o backend.
- O sistema criará as tabelas e dados iniciais automaticamente.

---

## 🤝 Autor e Suporte
Desenvolvido por **Kelvin Higino**.
🌐 [kelvinti.pages.dev](https://kelvinti.pages.dev)

---
> [!IMPORTANT]
> Para o funcionamento da biometria Futronic via `bridge`, certifique-se de que a biblioteca `ftrScanAPI.dll` está no diretório `bridge/` e os drivers oficiais estão instalados.
